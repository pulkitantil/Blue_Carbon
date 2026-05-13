// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./BlueCarbonRegistry.sol";
import "./BlueCarbonCredit.sol";

/**
 * @title CreditIssuanceManager
 * @dev Bridge between the Registry and the BCT token.
 *      After a verifier approves an MRV report, this contract
 *      calculates the token amount and calls issueCredits on the BCT contract.
 *
 *      Conversion: 1 tonne CO₂e = 1 BCT (18 decimals)
 *      Registry stores carbon ×1e4, so: BCT = carbonTonnes * 1e14
 */
contract CreditIssuanceManager is AccessControl, ReentrancyGuard {

    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    BlueCarbonRegistry public immutable registry;
    BlueCarbonCredit   public immutable creditToken;

    // Track which reports have already had credits issued (prevent double-minting)
    mapping(uint256 => bool) public reportCredited;

    // Issuance schedule: projectId → (reportId → BCT minted)
    mapping(uint256 => mapping(uint256 => uint256)) public issuanceLog;

    // Events
    event CreditsAutoIssued(
        uint256 indexed projectId,
        uint256 indexed reportId,
        address indexed recipient,
        uint256 bctAmount
    );

    constructor(
        address _admin,
        address _registry,
        address _creditToken
    ) {
        require(_registry    != address(0), "Manager: zero registry");
        require(_creditToken != address(0), "Manager: zero token");

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ISSUER_ROLE, _admin);

        registry     = BlueCarbonRegistry(_registry);
        creditToken  = BlueCarbonCredit(_creditToken);
    }

    /**
     * @dev Issue BCT for an approved MRV report.
     *      Called by a trusted issuer (or automated relayer) after on-chain
     *      report approval event.
     *
     * @param _reportId  Approved MRV report ID in the registry
     */
    function issueForReport(uint256 _reportId)
        external
        onlyRole(ISSUER_ROLE)
        nonReentrant
    {
        require(!reportCredited[_reportId], "Manager: already credited");

        BlueCarbonRegistry.MRVReport memory report = registry.getMRVReport(_reportId);
        require(
            report.status == BlueCarbonRegistry.MRVStatus.APPROVED,
            "Manager: report not approved"
        );

        BlueCarbonRegistry.Project memory project = registry.getProject(report.projectId);
        require(project.exists, "Manager: project not found");

        // Convert: registry stores ×1e4, BCT has 18 decimals → multiply by 1e14
        uint256 bctAmount = report.carbonTonnes * 1e14;

        reportCredited[_reportId] = true;
        issuanceLog[report.projectId][_reportId] = bctAmount;

        creditToken.issueCredits(
            project.owner,
            bctAmount,
            report.projectId,
            _reportId
        );

        emit CreditsAutoIssued(report.projectId, _reportId, project.owner, bctAmount);
    }

    /**
     * @dev Batch issue credits for multiple approved reports
     */
    function batchIssue(uint256[] calldata _reportIds)
        external
        onlyRole(ISSUER_ROLE)
        nonReentrant
    {
        for (uint256 i = 0; i < _reportIds.length; i++) {
            if (!reportCredited[_reportIds[i]]) {
                BlueCarbonRegistry.MRVReport memory report =
                    registry.getMRVReport(_reportIds[i]);

                if (report.status == BlueCarbonRegistry.MRVStatus.APPROVED) {
                    BlueCarbonRegistry.Project memory project =
                        registry.getProject(report.projectId);

                    uint256 bctAmount = report.carbonTonnes * 1e14;
                    reportCredited[_reportIds[i]] = true;
                    issuanceLog[report.projectId][_reportIds[i]] = bctAmount;

                    creditToken.issueCredits(
                        project.owner,
                        bctAmount,
                        report.projectId,
                        _reportIds[i]
                    );

                    emit CreditsAutoIssued(
                        report.projectId, _reportIds[i], project.owner, bctAmount
                    );
                }
            }
        }
    }

    /**
     * @dev Returns BCT equivalent of a raw carbonTonnes value (×1e4)
     */
    function carbonToBCT(uint256 _carbonTonnes) external pure returns (uint256) {
        return _carbonTonnes * 1e14;
    }

    /**
     * @dev Check if a report has been credited
     */
    function isReportCredited(uint256 _reportId) external view returns (bool) {
        return reportCredited[_reportId];
    }
}
