const { expect }      = require("chai");
const { ethers }      = require("hardhat");
const { time }        = require("@nomicfoundation/hardhat-network-helpers");

describe("Blue Carbon Registry System", function () {
  let registry, credit, manager;
  let admin, verifier, auditor, community, issuer, other;

  const VERIFIER_ROLE = ethers.id("VERIFIER_ROLE");
  const AUDITOR_ROLE  = ethers.id("AUDITOR_ROLE");
  const MINTER_ROLE   = ethers.id("MINTER_ROLE");
  const ISSUER_ROLE   = ethers.id("ISSUER_ROLE");

  // Sample project data
  const sampleProject = {
    name:         "Sundarbans Mangrove Project",
    description:  "Restoration of mangrove ecosystem in the Sundarbans delta",
    ecosystemType: 0,  // MANGROVE
    lat:          2185000,  // 21.85 × 1e6
    lon:          89420000, // 89.42 × 1e6
    area:         50000,    // 500.00 ha × 1e2
    countryCode:  "BD",
    metadataURI:  "ipfs://QmTestCID123"
  };

  beforeEach(async function () {
    [admin, verifier, auditor, community, issuer, other] = await ethers.getSigners();

    // Deploy contracts
    const Registry = await ethers.getContractFactory("BlueCarbonRegistry");
    registry = await Registry.deploy(admin.address);

    const Credit = await ethers.getContractFactory("BlueCarbonCredit");
    credit = await Credit.deploy(admin.address);

    const Manager = await ethers.getContractFactory("CreditIssuanceManager");
    manager = await Manager.deploy(
      admin.address,
      await registry.getAddress(),
      await credit.getAddress()
    );

    // Setup roles
    await registry.connect(admin).grantRole(VERIFIER_ROLE, verifier.address);
    await registry.connect(admin).grantRole(AUDITOR_ROLE,  auditor.address);
    await credit.connect(admin).grantRole(MINTER_ROLE, await manager.getAddress());
    await manager.connect(admin).grantRole(ISSUER_ROLE, issuer.address);
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe("BlueCarbonRegistry", function () {

    describe("Project Registration", function () {
      it("should register a project successfully", async function () {
        const tx = await registry.connect(community).registerProject(
          sampleProject.name,
          sampleProject.description,
          sampleProject.ecosystemType,
          sampleProject.lat,
          sampleProject.lon,
          sampleProject.area,
          sampleProject.countryCode,
          sampleProject.metadataURI
        );

        await expect(tx)
          .to.emit(registry, "ProjectRegistered")
          .withArgs(1, community.address, sampleProject.name, 0, "BD");

        const project = await registry.getProject(1);
        expect(project.name).to.equal(sampleProject.name);
        expect(project.owner).to.equal(community.address);
        expect(project.status).to.equal(0); // PENDING
        expect(project.countryCode).to.equal("BD");
      });

      it("should increment project counter", async function () {
        await registry.connect(community).registerProject(
          sampleProject.name, sampleProject.description, 0,
          sampleProject.lat, sampleProject.lon, sampleProject.area,
          "BD", sampleProject.metadataURI
        );
        await registry.connect(other).registerProject(
          "Project 2", "desc", 1,
          100000, 200000, 30000,
          "IN", "ipfs://QmOther"
        );
        expect(await registry.projectCounter()).to.equal(2);
      });

      it("should reject empty project name", async function () {
        await expect(
          registry.connect(community).registerProject(
            "", sampleProject.description, 0,
            sampleProject.lat, sampleProject.lon, sampleProject.area,
            "BD", sampleProject.metadataURI
          )
        ).to.be.revertedWith("Registry: name required");
      });

      it("should reject invalid country code", async function () {
        await expect(
          registry.connect(community).registerProject(
            sampleProject.name, sampleProject.description, 0,
            sampleProject.lat, sampleProject.lon, sampleProject.area,
            "BGD", sampleProject.metadataURI
          )
        ).to.be.revertedWith("Registry: invalid country code");
      });

      it("should track owner projects", async function () {
        await registry.connect(community).registerProject(
          sampleProject.name, sampleProject.description, 0,
          sampleProject.lat, sampleProject.lon, sampleProject.area,
          "BD", sampleProject.metadataURI
        );
        const owned = await registry.getOwnerProjects(community.address);
        expect(owned.length).to.equal(1);
        expect(owned[0]).to.equal(1);
      });
    });

    describe("MRV Report Submission", function () {
      beforeEach(async function () {
        await registry.connect(community).registerProject(
          sampleProject.name, sampleProject.description, 0,
          sampleProject.lat, sampleProject.lon, sampleProject.area,
          "BD", sampleProject.metadataURI
        );
      });

      it("should submit an MRV report", async function () {
        const carbonTonnes = 5000n * 10000n; // 5000.0000 tonnes × 1e4
        const measurementDate = BigInt(await time.latest()) - 86400n;

        const tx = await registry.connect(community).submitMRVReport(
          1,
          "ipfs://QmMRVReport001",
          carbonTonnes,
          measurementDate
        );

        await expect(tx)
          .to.emit(registry, "MRVReportSubmitted")
          .withArgs(1, 1, community.address, carbonTonnes);

        const report = await registry.getMRVReport(1);
        expect(report.carbonTonnes).to.equal(carbonTonnes);
        expect(report.status).to.equal(0); // SUBMITTED
      });

      it("should transition project to UNDER_REVIEW on first report", async function () {
        await registry.connect(community).submitMRVReport(
          1,
          "ipfs://QmMRV",
          10000n,
          BigInt(await time.latest()) - 100n
        );
        const project = await registry.getProject(1);
        expect(project.status).to.equal(1); // UNDER_REVIEW
      });

      it("should reject future measurement date", async function () {
        const futureDate = BigInt(await time.latest()) + 86400n;
        await expect(
          registry.connect(community).submitMRVReport(
            1, "ipfs://Qm", 10000n, futureDate
          )
        ).to.be.revertedWith("Registry: future date");
      });
    });

    describe("Verification", function () {
      beforeEach(async function () {
        await registry.connect(community).registerProject(
          sampleProject.name, sampleProject.description, 0,
          sampleProject.lat, sampleProject.lon, sampleProject.area,
          "BD", sampleProject.metadataURI
        );
        await registry.connect(community).submitMRVReport(
          1, "ipfs://QmMRV", 50000000n, BigInt(await time.latest()) - 100n
        );
      });

      it("should allow verifier to approve project", async function () {
        await registry.connect(verifier).verifyProject(1, true, "All checks passed");
        const project = await registry.getProject(1);
        expect(project.status).to.equal(2); // VERIFIED
        expect(project.verifiedBy).to.equal(verifier.address);
      });

      it("should reject non-verifier project approval", async function () {
        await expect(
          registry.connect(community).verifyProject(1, true, "notes")
        ).to.be.reverted;
      });

      it("should allow verifier to review MRV report", async function () {
        const tx = await registry.connect(verifier).reviewMRVReport(
          1, true, "Measurements verified on-site"
        );
        await expect(tx)
          .to.emit(registry, "MRVReportReviewed");

        const report = await registry.getMRVReport(1);
        expect(report.status).to.equal(2); // APPROVED
        expect(report.reviewedBy).to.equal(verifier.address);
      });

      it("should update carbon totals on report approval", async function () {
        await registry.connect(verifier).reviewMRVReport(1, true, "OK");
        const project = await registry.getProject(1);
        expect(project.totalCarbonTonnes).to.equal(50000000n);

        const stats = await registry.getRegistryStats();
        expect(stats.totalCarbon).to.equal(50000000n);
      });
    });

    describe("Suspend / Reinstate", function () {
      it("should allow auditor to suspend verified project", async function () {
        await registry.connect(community).registerProject(
          sampleProject.name, sampleProject.description, 0,
          sampleProject.lat, sampleProject.lon, sampleProject.area,
          "BD", sampleProject.metadataURI
        );
        await registry.connect(community).submitMRVReport(
          1, "ipfs://Qm", 10000n, BigInt(await time.latest()) - 100n
        );
        await registry.connect(verifier).verifyProject(1, true, "OK");
        await registry.connect(auditor).suspendProject(1, "Anomaly detected");

        const project = await registry.getProject(1);
        expect(project.status).to.equal(4); // SUSPENDED
      });
    });

    describe("Verification History", function () {
      it("should record full history trail", async function () {
        await registry.connect(community).registerProject(
          sampleProject.name, sampleProject.description, 0,
          sampleProject.lat, sampleProject.lon, sampleProject.area,
          "BD", sampleProject.metadataURI
        );
        await registry.connect(community).submitMRVReport(
          1, "ipfs://Qm", 10000n, BigInt(await time.latest()) - 100n
        );
        await registry.connect(verifier).verifyProject(1, true, "Verified");

        const history = await registry.getVerificationHistory(1);
        expect(history.length).to.be.gte(3);
      });
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe("BlueCarbonCredit (BCT)", function () {

    it("should have correct token metadata", async function () {
      expect(await credit.name()).to.equal("Blue Carbon Credit");
      expect(await credit.symbol()).to.equal("BCT");
      expect(await credit.decimals()).to.equal(18);
    });

    it("should allow minter to issue credits", async function () {
      await credit.connect(admin).issueCredits(
        community.address,
        ethers.parseEther("100"),
        1,
        1
      );
      expect(await credit.balanceOf(community.address)).to.equal(ethers.parseEther("100"));
    });

    it("should reject minting by non-minter", async function () {
      await expect(
        credit.connect(other).issueCredits(other.address, ethers.parseEther("1"), 1, 1)
      ).to.be.reverted;
    });

    it("should allow credit retirement", async function () {
      await credit.connect(admin).issueCredits(
        community.address,
        ethers.parseEther("50"),
        1,
        1
      );

      const tx = await credit.connect(community).retireCredits(
        ethers.parseEther("10"),
        1,
        community.address,
        "Annual corporate offset 2025"
      );

      await expect(tx)
        .to.emit(credit, "CreditRetired")
        .withArgs(1, community.address, 1, ethers.parseEther("10"), "Annual corporate offset 2025");

      expect(await credit.balanceOf(community.address)).to.equal(ethers.parseEther("40"));
    });

    it("should track project retired tokens", async function () {
      await credit.connect(admin).issueCredits(community.address, ethers.parseEther("100"), 1, 1);
      await credit.connect(community).retireCredits(
        ethers.parseEther("30"), 1, community.address, "Offset"
      );
      expect(await credit.projectRetiredTokens(1)).to.equal(ethers.parseEther("30"));
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe("CreditIssuanceManager", function () {

    beforeEach(async function () {
      // Register project
      await registry.connect(community).registerProject(
        sampleProject.name, sampleProject.description, 0,
        sampleProject.lat, sampleProject.lon, sampleProject.area,
        "BD", sampleProject.metadataURI
      );
      // Submit MRV report (carbonTonnes = 1000.0000 = 10000000 scaled)
      await registry.connect(community).submitMRVReport(
        1, "ipfs://QmMRV", 10000000n, BigInt(await time.latest()) - 100n
      );
      // Verifier approves the report
      await registry.connect(verifier).reviewMRVReport(1, true, "Verified");
    });

    it("should issue BCT for an approved report", async function () {
      const tx = await manager.connect(issuer).issueForReport(1);

      // 10000000 × 1e14 = 1e21 = 1000 BCT
      const expectedBCT = 10000000n * BigInt(1e14);
      await expect(tx)
        .to.emit(manager, "CreditsAutoIssued")
        .withArgs(1, 1, community.address, expectedBCT);

      expect(await credit.balanceOf(community.address)).to.equal(expectedBCT);
    });

    it("should prevent double-issuing for same report", async function () {
      await manager.connect(issuer).issueForReport(1);
      await expect(
        manager.connect(issuer).issueForReport(1)
      ).to.be.revertedWith("Manager: already credited");
    });

    it("should not issue for unapproved report", async function () {
      // Submit a new report (not yet approved)
      await registry.connect(community).submitMRVReport(
        1, "ipfs://QmNew", 5000000n, BigInt(await time.latest()) - 200n
      );
      await expect(
        manager.connect(issuer).issueForReport(2)
      ).to.be.revertedWith("Manager: report not approved");
    });

    it("should convert carbon tonnes to BCT correctly", async function () {
      // 1 tonne = 10000 (scaled ×1e4) → should give 1 BCT (1e18)
      const result = await manager.carbonToBCT(10000);
      expect(result).to.equal(ethers.parseEther("1"));
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  describe("Full End-to-End Flow", function () {
    it("should complete the full blue carbon lifecycle", async function () {
      // 1. Register community project
      await registry.connect(community).registerProject(
        "Kerala Mangrove Initiative",
        "Restoration of 200ha mangrove belt in Kerala coastline",
        0, 1000000, 76500000, 20000, "IN", "ipfs://QmKerala"
      );
      expect((await registry.getProject(1)).status).to.equal(0); // PENDING

      // 2. Submit MRV data (850 tonnes)
      await registry.connect(community).submitMRVReport(
        1, "ipfs://QmMRV_Kerala_2025", 8500000n, BigInt(await time.latest()) - 100n
      );
      expect((await registry.getProject(1)).status).to.equal(1); // UNDER_REVIEW

      // 3. Verifier reviews the report
      await registry.connect(verifier).reviewMRVReport(1, true, "Field verified ✓");
      const report = await registry.getMRVReport(1);
      expect(report.status).to.equal(2); // APPROVED

      // 4. Verifier approves the project
      await registry.connect(verifier).verifyProject(1, true, "Project certified");
      expect((await registry.getProject(1)).status).to.equal(2); // VERIFIED

      // 5. Issue BCT credits
      await manager.connect(issuer).issueForReport(1);
      const expectedBCT = 8500000n * BigInt(1e14); // 850 BCT
      expect(await credit.balanceOf(community.address)).to.equal(expectedBCT);

      // 6. Community retires some credits to offset emissions
      await credit.connect(community).retireCredits(
        ethers.parseEther("100"),
        1,
        community.address,
        "Kerala Fishermen Co-op 2025 offset"
      );
      expect(await credit.balanceOf(community.address))
        .to.equal(expectedBCT - ethers.parseEther("100"));

      // 7. Check registry stats
      const stats = await registry.getRegistryStats();
      expect(stats.totalProjects).to.equal(1);
      expect(stats.verifiedProjects).to.equal(1);
      expect(stats.totalReports).to.equal(1);

      console.log("\n   🌊 Full lifecycle test passed!");
      console.log(`   Projects: ${stats.totalProjects} | Verified: ${stats.verifiedProjects}`);
      console.log(`   Carbon: ${stats.totalCarbon / 10000n} tonnes`);
      console.log(`   BCT issued: ${ethers.formatEther(expectedBCT)} BCT`);
    });
  });
});
