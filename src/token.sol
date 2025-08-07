// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "../lib/openzeppelin-contracts/contracts/access/Ownable.sol";
import "../lib/openzeppelin-contracts/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract Token is ERC20, Ownable, ERC20Burnable {
    uint256 public transferFeePercentage = 0; // in basis points (1% = 100)
    address public feeCollector;
    mapping(address => bool) public isExemptFromFee;
    string public logoURL;

    // Events
    event TokensBurned(address indexed burner, uint256 amount, string reason);
    event TransferFeeSet(uint256 oldFee, uint256 newFee);
    event FeeCollectorSet(address indexed oldCollector, address indexed newCollector);
    event FeeExemptionSet(address indexed account, bool isExempt);

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        string memory initialLogoURL
    ) ERC20(name, symbol) 
      Ownable(msg.sender)
    {
        uint256 mintAmount = initialSupply * 10**decimals();
        _mint(msg.sender, mintAmount);
        logoURL = initialLogoURL;
        feeCollector = msg.sender;
        isExemptFromFee[msg.sender] = true;
    }

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function setTransferFeePercentage(uint256 newFeePercentage) external onlyOwner {
        require(newFeePercentage <= 1000, "Fee cannot exceed 10%");
        emit TransferFeeSet(transferFeePercentage, newFeePercentage);
        transferFeePercentage = newFeePercentage;
    }

    function setFeeCollector(address newFeeCollector) external onlyOwner {
        require(newFeeCollector != address(0), "Cannot set fee collector to zero address");
        emit FeeCollectorSet(feeCollector, newFeeCollector);
        feeCollector = newFeeCollector;
    }

    function setFeeExemption(address account, bool exempt) external onlyOwner {
        isExemptFromFee[account] = exempt;
        emit FeeExemptionSet(account, exempt);
    }

    function updateLogoURL(string calldata newLogoURL) external onlyOwner {
        logoURL = newLogoURL;
    }

    function burnWithReason(uint256 amount, string memory reason) external {
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount, reason);
    }

    function burnFrom(address from, uint256 amount) public override onlyOwner {
        _burn(from, amount);
        emit TokensBurned(from, amount, "Owner initiated burn");
    }

    function batchBurn(address[] calldata accounts, uint256[] calldata amounts) external onlyOwner {
        require(accounts.length == amounts.length, "Arrays must have same length");

        for (uint256 i = 0; i < accounts.length; i++) {
            _burn(accounts[i], amounts[i]);
            emit TokensBurned(accounts[i], amounts[i], "Batch burn");
        }
    }

    // Override transfer function to include fee
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transferWithFee(_msgSender(), recipient, amount);
        return true;
    }

    // Override transferFrom function to include fee
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(sender, spender, amount);
        _transferWithFee(sender, recipient, amount);
        return true;
    }

    function _transferWithFee(address sender, address recipient, uint256 amount) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        if (transferFeePercentage == 0 || isExemptFromFee[sender] || isExemptFromFee[recipient]) {
            super._transfer(sender, recipient, amount);
        } else {
            require(feeCollector != address(0), "Fee collector not set");
            uint256 feeAmount = (amount * transferFeePercentage) / 10000;
            uint256 transferAmount = amount - feeAmount;

            super._transfer(sender, feeCollector, feeAmount);
            super._transfer(sender, recipient, transferAmount);
        }
    }

    function hasTokens(address account) external view returns (bool) {
        return balanceOf(account) > 0;
    }
}