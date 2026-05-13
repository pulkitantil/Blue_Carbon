// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BlueCarbonCredit
 * @dev ERC-20 token representing 1 BCT = 1 tonne of verified blue carbon.
 *      Minted only by the registry upon verified MRV data.
 *      Can be burned (retired) to offset emissions.
 */
contract BlueCarbonCredit is ERC20, ERC20Burnable, ERC20Pausable, AccessControl {

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Track retirements for offsetting
    struct Retirement {
        address  beneficiary;
        uint256  amount;
        uint256  projectId;
        string   reason;
        uint256  timestamp;
    }

    uint256 public retirementCounter;
    mapping(uint256 => Retirement) public retirements;
    mapping(address => uint256[])  public addressRetirements;
    mapping(uint256 => uint256)    public projectRetiredTokens; // projectId → retired BCT

    // Credit issuance tracking
    struct Issuance {
        uint256 projectId;
        uint256 reportId;
        address recipient;
        uint256 amount;
        uint256 timestamp;
    }

    uint256 public issuanceCounter;
    mapping(uint256 => Issuance)  public issuances;
    mapping(uint256 => uint256[]) public projectIssuances; // projectId → issuanceIds
    mapping(uint256 => uint256)   public projectIssuedTokens; // projectId → total BCT issued

    // Events
    event CreditIssued(
        uint256 indexed issuanceId,
        uint256 indexed projectId,
        uint256 indexed reportId,
        address recipient,
        uint256 amount
    );
    event CreditRetired(
        uint256 indexed retirementId,
        address indexed beneficiary,
        uint256 indexed projectId,
        uint256 amount,
        string  reason
    );

    constructor(address _admin) ERC20("Blue Carbon Credit", "BCT") {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    /**
     * @dev Issue carbon credits after verified MRV report
     * @param _to         Community / project owner receiving credits
     * @param _amount     Tokens to mint (1 BCT = 1 tonne, 18 decimals)
     * @param _projectId  Registry project ID
     * @param _reportId   MRV report that triggered issuance
     */
    function issueCredits(
        address _to,
        uint256 _amount,
        uint256 _projectId,
        uint256 _reportId
    ) external onlyRole(MINTER_ROLE) {
        require(_to != address(0), "BCT: mint to zero address");
        require(_amount > 0,       "BCT: amount must be > 0");

        uint256 issuanceId = ++issuanceCounter;

        issuances[issuanceId] = Issuance({
            projectId: _projectId,
            reportId:  _reportId,
            recipient: _to,
            amount:    _amount,
            timestamp: block.timestamp
        });

        projectIssuances[_projectId].push(issuanceId);
        projectIssuedTokens[_projectId] += _amount;

        _mint(_to, _amount);

        emit CreditIssued(issuanceId, _projectId, _reportId, _to, _amount);
    }

    /**
     * @dev Retire (permanently burn) credits to claim offset
     * @param _amount      BCT to retire
     * @param _projectId   Project being credited
     * @param _beneficiary Entity on whose behalf credits are retired
     * @param _reason      Offset reason / certificate reference
     */
    function retireCredits(
        uint256 _amount,
        uint256 _projectId,
        address _beneficiary,
        string  memory _reason
    ) external {
        require(_amount > 0, "BCT: amount must be > 0");
        require(balanceOf(msg.sender) >= _amount, "BCT: insufficient balance");

        uint256 retirementId = ++retirementCounter;

        retirements[retirementId] = Retirement({
            beneficiary: _beneficiary,
            amount:      _amount,
            projectId:   _projectId,
            reason:      _reason,
            timestamp:   block.timestamp
        });

        addressRetirements[_beneficiary].push(retirementId);
        projectRetiredTokens[_projectId] += _amount;

        _burn(msg.sender, _amount);

        emit CreditRetired(retirementId, _beneficiary, _projectId, _amount, _reason);
    }

    // Views
    function getRetirement(uint256 _id) external view returns (Retirement memory) {
        return retirements[_id];
    }

    function getIssuance(uint256 _id) external view returns (Issuance memory) {
        return issuances[_id];
    }

    function getProjectIssuances(uint256 _projectId) external view returns (uint256[] memory) {
        return projectIssuances[_projectId];
    }

    function getAddressRetirements(address _addr) external view returns (uint256[] memory) {
        return addressRetirements[_addr];
    }

    function decimals() public pure override returns (uint8) {
        return 18; // 1 BCT = 1 tonne
    }

    // Pausable
    function pause()   external onlyRole(PAUSER_ROLE) { _pause(); }
    function unpause() external onlyRole(PAUSER_ROLE) { _unpause(); }

    function _update(address from, address to, uint256 value)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._update(from, to, value);
    }
}
