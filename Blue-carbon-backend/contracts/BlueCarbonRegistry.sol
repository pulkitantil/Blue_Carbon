// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title BlueCarbonRegistry
 * @dev Core registry for blue carbon projects (mangroves, seagrass, saltmarshes)
 *      Manages project lifecycle: registration → verification → credit issuance
 */
contract BlueCarbonRegistry is AccessControl, ReentrancyGuard, Pausable {
    
    // ─── Roles ───────────────────────────────────────────────────────────────
    bytes32 public constant VERIFIER_ROLE    = keccak256("VERIFIER_ROLE");
    bytes32 public constant AUDITOR_ROLE     = keccak256("AUDITOR_ROLE");
    bytes32 public constant REGISTRY_ADMIN   = keccak256("REGISTRY_ADMIN");

    // ─── Enums ────────────────────────────────────────────────────────────────
    enum EcosystemType  { MANGROVE, SEAGRASS, SALTMARSH, TIDAL_WETLAND }
    enum ProjectStatus  { PENDING, UNDER_REVIEW, VERIFIED, REJECTED, SUSPENDED, COMPLETED }
    enum MRVStatus      { SUBMITTED, IN_REVIEW, APPROVED, REJECTED }

    // ─── Structs ──────────────────────────────────────────────────────────────
    struct GeoCoordinates {
        int256  latitude;   // scaled ×1e6
        int256  longitude;  // scaled ×1e6
        uint256 areaHectares; // scaled ×1e2
    }

    struct Project {
        uint256         id;
        address         owner;
        string          name;
        string          description;
        EcosystemType   ecosystemType;
        ProjectStatus   status;
        GeoCoordinates  location;
        string          countryCode;   // ISO-3166-1 alpha-2
        string          metadataURI;   // IPFS CID for images/docs
        uint256         registeredAt;
        uint256         verifiedAt;
        address         verifiedBy;
        uint256         totalCarbonTonnes; // scaled ×1e4 (4 decimal places)
        bool            exists;
    }

    struct MRVReport {
        uint256     reportId;
        uint256     projectId;
        address     submittedBy;
        string      dataURI;          // IPFS CID for report bundle
        uint256     carbonTonnes;     // tonnes measured (scaled ×1e4)
        uint256     measurementDate;
        MRVStatus   status;
        address     reviewedBy;
        string      reviewNotes;
        uint256     submittedAt;
        uint256     reviewedAt;
    }

    struct VerificationEvent {
        uint256 timestamp;
        address actor;
        ProjectStatus newStatus;
        string  notes;
    }

    // ─── State ────────────────────────────────────────────────────────────────
    uint256 public projectCounter;
    uint256 public reportCounter;

    mapping(uint256 => Project)               public projects;
    mapping(uint256 => MRVReport)             public mrvReports;
    mapping(uint256 => uint256[])             public projectReports;      // projectId → reportIds
    mapping(address => uint256[])             public ownerProjects;       // owner → projectIds
    mapping(uint256 => VerificationEvent[])   public verificationHistory; // projectId → events
    mapping(address => bool)                  public registeredCommunities;

    // Global stats
    uint256 public totalVerifiedProjects;
    uint256 public totalCarbonRegistered; // scaled ×1e4

    // ─── Events ───────────────────────────────────────────────────────────────
    event ProjectRegistered(
        uint256 indexed projectId,
        address indexed owner,
        string  name,
        EcosystemType ecosystemType,
        string  countryCode
    );
    event ProjectStatusChanged(
        uint256 indexed projectId,
        ProjectStatus  oldStatus,
        ProjectStatus  newStatus,
        address indexed actor
    );
    event MRVReportSubmitted(
        uint256 indexed reportId,
        uint256 indexed projectId,
        address indexed submittedBy,
        uint256 carbonTonnes
    );
    event MRVReportReviewed(
        uint256 indexed reportId,
        uint256 indexed projectId,
        MRVStatus       status,
        address indexed reviewedBy
    );
    event CarbonDataUpdated(
        uint256 indexed projectId,
        uint256 additionalTonnes,
        uint256 totalTonnes
    );
    event CommunityRegistered(address indexed community);
    event MetadataUpdated(uint256 indexed projectId, string newURI);

    // ─── Modifiers ────────────────────────────────────────────────────────────
    modifier projectExists(uint256 _projectId) {
        require(projects[_projectId].exists, "Registry: project not found");
        _;
    }

    modifier onlyProjectOwner(uint256 _projectId) {
        require(projects[_projectId].owner == msg.sender, "Registry: not project owner");
        _;
    }

    modifier reportExists(uint256 _reportId) {
        require(mrvReports[_reportId].submittedAt > 0, "Registry: report not found");
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────
    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(REGISTRY_ADMIN, _admin);
    }

    // ─── Community Registration ───────────────────────────────────────────────
    function registerCommunity(address _community) external onlyRole(REGISTRY_ADMIN) {
        registeredCommunities[_community] = true;
        emit CommunityRegistered(_community);
    }

    // ─── Project Registration ─────────────────────────────────────────────────
    /**
     * @dev Register a new blue carbon project
     * @param _name        Human-readable project name
     * @param _description Short description
     * @param _ecosystemType Mangrove / Seagrass / Saltmarsh / Tidal Wetland
     * @param _lat         Latitude ×1e6
     * @param _lon         Longitude ×1e6
     * @param _areaHectares Area ×1e2 (e.g., 10050 = 100.50 ha)
     * @param _countryCode ISO-3166-1 alpha-2
     * @param _metadataURI IPFS CID of supporting documents
     */
    function registerProject(
        string  memory _name,
        string  memory _description,
        EcosystemType  _ecosystemType,
        int256         _lat,
        int256         _lon,
        uint256        _areaHectares,
        string  memory _countryCode,
        string  memory _metadataURI
    ) external whenNotPaused nonReentrant returns (uint256 projectId) {
        require(bytes(_name).length > 0,        "Registry: name required");
        require(bytes(_countryCode).length == 2,"Registry: invalid country code");
        require(_areaHectares > 0,              "Registry: area must be > 0");

        projectId = ++projectCounter;

        projects[projectId] = Project({
            id:               projectId,
            owner:            msg.sender,
            name:             _name,
            description:      _description,
            ecosystemType:    _ecosystemType,
            status:           ProjectStatus.PENDING,
            location:         GeoCoordinates(_lat, _lon, _areaHectares),
            countryCode:      _countryCode,
            metadataURI:      _metadataURI,
            registeredAt:     block.timestamp,
            verifiedAt:       0,
            verifiedBy:       address(0),
            totalCarbonTonnes:0,
            exists:           true
        });

        ownerProjects[msg.sender].push(projectId);

        _recordVerificationEvent(
            projectId,
            msg.sender,
            ProjectStatus.PENDING,
            "Project registered"
        );

        emit ProjectRegistered(projectId, msg.sender, _name, _ecosystemType, _countryCode);
    }

    // ─── MRV Report Submission ────────────────────────────────────────────────
    /**
     * @dev Submit an MRV data report for a project
     * @param _projectId     Target project
     * @param _dataURI       IPFS CID containing photos, measurements, GPS data
     * @param _carbonTonnes  Measured carbon (×1e4)
     * @param _measurementDate  Unix timestamp of field measurement
     */
    function submitMRVReport(
        uint256 _projectId,
        string  memory _dataURI,
        uint256 _carbonTonnes,
        uint256 _measurementDate
    )
        external
        whenNotPaused
        nonReentrant
        projectExists(_projectId)
        returns (uint256 reportId)
    {
        Project storage p = projects[_projectId];
        require(
            p.owner == msg.sender || hasRole(VERIFIER_ROLE, msg.sender),
            "Registry: not authorized"
        );
        require(
            p.status == ProjectStatus.VERIFIED || p.status == ProjectStatus.PENDING || p.status == ProjectStatus.UNDER_REVIEW,
            "Registry: project not in valid state"
        );
        require(bytes(_dataURI).length > 0, "Registry: data URI required");
        require(_carbonTonnes > 0,          "Registry: carbon tonnes must be > 0");
        require(_measurementDate <= block.timestamp, "Registry: future date");

        reportId = ++reportCounter;

        mrvReports[reportId] = MRVReport({
            reportId:        reportId,
            projectId:       _projectId,
            submittedBy:     msg.sender,
            dataURI:         _dataURI,
            carbonTonnes:    _carbonTonnes,
            measurementDate: _measurementDate,
            status:          MRVStatus.SUBMITTED,
            reviewedBy:      address(0),
            reviewNotes:     "",
            submittedAt:     block.timestamp,
            reviewedAt:      0
        });

        projectReports[_projectId].push(reportId);

        // Auto-transition project to UNDER_REVIEW if still PENDING
        if (p.status == ProjectStatus.PENDING) {
            _changeProjectStatus(_projectId, ProjectStatus.UNDER_REVIEW, msg.sender, "MRV report submitted");
        }

        emit MRVReportSubmitted(reportId, _projectId, msg.sender, _carbonTonnes);
    }

    // ─── Verification ─────────────────────────────────────────────────────────
    /**
     * @dev Verifier reviews an MRV report and approves/rejects it
     */
    function reviewMRVReport(
        uint256 _reportId,
        bool    _approved,
        string  memory _notes
    )
        external
        onlyRole(VERIFIER_ROLE)
        nonReentrant
        reportExists(_reportId)
    {
        MRVReport storage report = mrvReports[_reportId];
        require(report.status == MRVStatus.SUBMITTED || report.status == MRVStatus.IN_REVIEW,
            "Registry: report already finalized");

        report.status     = _approved ? MRVStatus.APPROVED : MRVStatus.REJECTED;
        report.reviewedBy = msg.sender;
        report.reviewNotes= _notes;
        report.reviewedAt = block.timestamp;

        uint256 pid = report.projectId;

        if (_approved) {
            // Update carbon totals
            projects[pid].totalCarbonTonnes += report.carbonTonnes;
            totalCarbonRegistered           += report.carbonTonnes;

            emit CarbonDataUpdated(pid, report.carbonTonnes, projects[pid].totalCarbonTonnes);
        }

        emit MRVReportReviewed(_reportId, pid, report.status, msg.sender);
    }

    /**
     * @dev Verifier approves/rejects an entire project
     */
    function verifyProject(
        uint256 _projectId,
        bool    _approved,
        string  memory _notes
    )
        external
        onlyRole(VERIFIER_ROLE)
        nonReentrant
        projectExists(_projectId)
    {
        Project storage p = projects[_projectId];
        require(
            p.status == ProjectStatus.UNDER_REVIEW || p.status == ProjectStatus.PENDING,
            "Registry: not reviewable"
        );

        ProjectStatus newStatus = _approved ? ProjectStatus.VERIFIED : ProjectStatus.REJECTED;

        if (_approved) {
            p.verifiedAt = block.timestamp;
            p.verifiedBy = msg.sender;
            totalVerifiedProjects++;
        }

        _changeProjectStatus(_projectId, newStatus, msg.sender, _notes);
    }

    /**
     * @dev Auditor can suspend a project
     */
    function suspendProject(uint256 _projectId, string memory _reason)
        external
        onlyRole(AUDITOR_ROLE)
        projectExists(_projectId)
    {
        require(projects[_projectId].status == ProjectStatus.VERIFIED, "Registry: not verified");
        _changeProjectStatus(_projectId, ProjectStatus.SUSPENDED, msg.sender, _reason);
    }

    /**
     * @dev Auditor reinstates a suspended project
     */
    function reinstateProject(uint256 _projectId, string memory _notes)
        external
        onlyRole(AUDITOR_ROLE)
        projectExists(_projectId)
    {
        require(projects[_projectId].status == ProjectStatus.SUSPENDED, "Registry: not suspended");
        _changeProjectStatus(_projectId, ProjectStatus.VERIFIED, msg.sender, _notes);
    }

    // ─── Metadata Updates ─────────────────────────────────────────────────────
    function updateMetadata(uint256 _projectId, string memory _newURI)
        external
        projectExists(_projectId)
        onlyProjectOwner(_projectId)
    {
        projects[_projectId].metadataURI = _newURI;
        emit MetadataUpdated(_projectId, _newURI);
    }

    // ─── Views ────────────────────────────────────────────────────────────────
    function getProject(uint256 _projectId)
        external
        view
        projectExists(_projectId)
        returns (Project memory)
    {
        return projects[_projectId];
    }

    function getMRVReport(uint256 _reportId)
        external
        view
        reportExists(_reportId)
        returns (MRVReport memory)
    {
        return mrvReports[_reportId];
    }

    function getProjectReports(uint256 _projectId)
        external
        view
        projectExists(_projectId)
        returns (uint256[] memory)
    {
        return projectReports[_projectId];
    }

    function getOwnerProjects(address _owner)
        external
        view
        returns (uint256[] memory)
    {
        return ownerProjects[_owner];
    }

    function getVerificationHistory(uint256 _projectId)
        external
        view
        projectExists(_projectId)
        returns (VerificationEvent[] memory)
    {
        return verificationHistory[_projectId];
    }

    function getRegistryStats()
        external
        view
        returns (
            uint256 totalProjects,
            uint256 verifiedProjects,
            uint256 totalReports,
            uint256 totalCarbon
        )
    {
        return (projectCounter, totalVerifiedProjects, reportCounter, totalCarbonRegistered);
    }

    // ─── Admin ────────────────────────────────────────────────────────────────
    function pause()   external onlyRole(REGISTRY_ADMIN) { _pause(); }
    function unpause() external onlyRole(REGISTRY_ADMIN) { _unpause(); }

    // ─── Internal ─────────────────────────────────────────────────────────────
    function _changeProjectStatus(
        uint256       _projectId,
        ProjectStatus _newStatus,
        address       _actor,
        string memory _notes
    ) internal {
        ProjectStatus old = projects[_projectId].status;
        projects[_projectId].status = _newStatus;
        _recordVerificationEvent(_projectId, _actor, _newStatus, _notes);
        emit ProjectStatusChanged(_projectId, old, _newStatus, _actor);
    }

    function _recordVerificationEvent(
        uint256       _projectId,
        address       _actor,
        ProjectStatus _status,
        string memory _notes
    ) internal {
        verificationHistory[_projectId].push(
            VerificationEvent(block.timestamp, _actor, _status, _notes)
        );
    }
}
