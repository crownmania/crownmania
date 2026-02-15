// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CrownManiaNFT
 * @dev ERC-721 collectible for CrownMania on Polygon
 *      - 500 editions pre-minted to backend wallet
 *      - tokenId = edition number (1-500)
 *      - Metadata via tokenURI for OpenSea compatibility
 */
contract CrownManiaNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 public constant MAX_SUPPLY = 500;
    uint256 public totalMinted;
    string  public baseTokenURI;

    event EditionMinted(uint256 indexed tokenId, address indexed to);
    event EditionTransferred(uint256 indexed tokenId, address indexed from, address indexed to);

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _baseURI
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        baseTokenURI = _baseURI;
    }

    /**
     * @dev Batch mint all 500 editions to the owner (deployer / backend wallet)
     *      Call this right after deployment. tokenId = edition 1-500.
     */
    function mintAllEditions() external onlyOwner {
        require(totalMinted == 0, "Editions already minted");

        for (uint256 i = 1; i <= MAX_SUPPLY; i++) {
            _safeMint(msg.sender, i);
            totalMinted++;
        }
    }

    /**
     * @dev Mint a batch of editions (for gas-safe partial minting)
     * @param start  First tokenId to mint (inclusive)
     * @param count  Number of tokens
     */
    function mintBatch(uint256 start, uint256 count) external onlyOwner {
        require(start >= 1 && start + count - 1 <= MAX_SUPPLY, "Out of range");

        for (uint256 i = start; i < start + count; i++) {
            if (_ownerOf(i) == address(0)) {
                _safeMint(msg.sender, i);
                totalMinted++;
            }
        }
    }

    /**
     * @dev Transfer an edition from backend wallet to a user wallet
     */
    function transferEdition(address to, uint256 tokenId) external onlyOwner {
        require(ownerOf(tokenId) == msg.sender, "Not owner of this edition");
        _transfer(msg.sender, to, tokenId);
        emit EditionTransferred(tokenId, msg.sender, to);
    }

    /**
     * @dev Update base token URI (for metadata hosting changes)
     */
    function setBaseURI(string memory _newBaseURI) external onlyOwner {
        baseTokenURI = _newBaseURI;
    }

    // ── Overrides ────────────────────────────────

    function _baseURI() internal view override returns (string memory) {
        return baseTokenURI;
    }

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721URIStorage) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
