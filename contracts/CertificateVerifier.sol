// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CertificateVerifier
 * @dev Academic Credential Verification Smart Contract for Ethereum Sepolia Testnet.
 * Designed for 3rd-year B.Tech Mini Project / Academic Proof-of-Concept.
 */
contract CertificateVerifier {
    // Contract administrator / Academic Institution authority
    address public admin;

    // Certificate metadata structure
    struct Certificate {
        string studentName;
        string courseName;
        uint256 issueDate;
        bool isValid;
    }

    // Mapping from SHA-256 document hash (bytes32) to Certificate struct
    mapping(bytes32 => Certificate) private certificates;

    // Events for indexed blockchain logging
    event CertificateIssued(
        bytes32 indexed docHash,
        string studentName,
        string courseName,
        uint256 issueDate,
        address indexed issuer
    );

    event CertificateRevoked(
        bytes32 indexed docHash,
        address indexed revokedBy
    );

    // Access control modifier
    modifier onlyAdmin() {
        require(msg.sender == admin, "Error: Caller is not the authorized institution admin");
        _;
    }

    /**
     * @dev Sets deployer as the initial admin authority.
     */
    constructor() {
        admin = msg.sender;
    }

    /**
     * @notice Issue a new tamper-proof academic certificate
     * @param docHash The SHA-256 cryptographic digest of the original certificate file (as bytes32)
     * @param studentName Full name of the candidate/student
     * @param courseName Name of degree, course, or certification
     */
    function issueCertificate(
        bytes32 docHash,
        string memory studentName,
        string memory courseName
    ) external onlyAdmin {
        require(docHash != bytes32(0), "Error: Invalid document hash");
        require(bytes(studentName).length > 0, "Error: Student name cannot be empty");
        require(bytes(courseName).length > 0, "Error: Course name cannot be empty");
        require(!certificates[docHash].isValid, "Error: Certificate with this hash is already issued");

        certificates[docHash] = Certificate({
            studentName: studentName,
            courseName: courseName,
            issueDate: block.timestamp,
            isValid: true
        });

        emit CertificateIssued(docHash, studentName, courseName, block.timestamp, msg.sender);
    }

    /**
     * @notice Verify a certificate using its document hash
     * @param docHash The SHA-256 hash of the document to inspect
     * @return studentName Name of the candidate
     * @return courseName Degree/Course awarded
     * @return issueDate Unix timestamp of the issuance
     * @return isValid True if certificate exists and has not been revoked
     */
    function verifyCertificate(bytes32 docHash)
        external
        view
        returns (
            string memory studentName,
            string memory courseName,
            uint256 issueDate,
            bool isValid
        )
    {
        Certificate memory cert = certificates[docHash];
        return (cert.studentName, cert.courseName, cert.issueDate, cert.isValid);
    }

    /**
     * @notice Revoke a previously issued certificate in case of discrepancy/fraud
     * @param docHash The SHA-256 hash of the certificate to revoke
     */
    function revokeCertificate(bytes32 docHash) external onlyAdmin {
        require(certificates[docHash].isValid, "Error: Certificate does not exist or already invalid");
        certificates[docHash].isValid = false;
        emit CertificateRevoked(docHash, msg.sender);
    }

    /**
     * @notice Transfer administration rights to another university/college wallet
     * @param newAdmin Address of the new administrator
     */
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Error: New admin address cannot be zero");
        admin = newAdmin;
    }
}
