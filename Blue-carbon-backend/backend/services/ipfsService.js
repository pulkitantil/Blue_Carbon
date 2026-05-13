import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const PINATA_BASE = "https://api.pinata.cloud";

const pinataHeaders = () => ({
  pinata_api_key:        process.env.PINATA_API_KEY,
  pinata_secret_api_key: process.env.PINATA_SECRET_API_KEY,
});

/**
 * Upload a file buffer to IPFS via Pinata
 * @param {Buffer} fileBuffer  - Raw file data
 * @param {string} fileName    - Original file name
 * @param {Object} metadata    - Key-value metadata to store with pin
 * @returns {string} IPFS CID (e.g. "QmXyz...")
 */
export async function uploadFileToPinata(fileBuffer, fileName, metadata = {}) {
  const form = new FormData();
  form.append("file", fileBuffer, { filename: fileName });

  const pinataMetadata = JSON.stringify({ name: fileName, keyvalues: metadata });
  form.append("pinataMetadata", pinataMetadata);

  const pinataOptions = JSON.stringify({ cidVersion: 1 });
  form.append("pinataOptions", pinataOptions);

  const response = await axios.post(
    `${PINATA_BASE}/pinning/pinFileToIPFS`,
    form,
    {
      maxBodyLength: Infinity,
      headers: {
        ...form.getHeaders(),
        ...pinataHeaders(),
      },
    }
  );

  return response.data.IpfsHash;
}

/**
 * Upload a JSON object to IPFS via Pinata
 * @param {Object} data       - JSON-serialisable data
 * @param {string} name       - Human-readable pin name
 * @returns {string} IPFS CID
 */
export async function uploadJSONToPinata(data, name = "blue-carbon-metadata") {
  const response = await axios.post(
    `${PINATA_BASE}/pinning/pinJSONToIPFS`,
    {
      pinataContent:  data,
      pinataMetadata: { name },
      pinataOptions:  { cidVersion: 1 },
    },
    {
      headers: {
        "Content-Type": "application/json",
        ...pinataHeaders(),
      },
    }
  );

  return response.data.IpfsHash;
}

/**
 * Build a project metadata object and pin to IPFS.
 * Returns the IPFS URI (ipfs://<CID>) to store on-chain.
 */
export async function pinProjectMetadata({ project, imageFiles = [] }) {
  // Upload each photo and collect CIDs
  const photoCIDs = [];
  for (const img of imageFiles) {
    const cid = await uploadFileToPinata(
      img.buffer,
      img.originalname,
      { type: "project-photo", project: project.name }
    );
    photoCIDs.push(`ipfs://${cid}`);
  }

  // Build metadata JSON (follows ERC-1155 metadata standard loosely)
  const metadata = {
    name:        project.name,
    description: project.description,
    ecosystem:   project.ecosystemType,
    location: {
      latitude:     project.latitude,
      longitude:    project.longitude,
      areaHectares: project.areaHectares,
      countryCode:  project.countryCode,
    },
    images:       photoCIDs,
    attributes: [
      { trait_type: "Ecosystem Type", value: project.ecosystemType },
      { trait_type: "Country",        value: project.countryCode },
      { trait_type: "Area (ha)",      value: project.areaHectares },
    ],
    createdAt: new Date().toISOString(),
  };

  const cid = await uploadJSONToPinata(metadata, `project-${project.name}`);
  return `ipfs://${cid}`;
}

/**
 * Build an MRV report bundle and pin to IPFS.
 */
export async function pinMRVReport({ report, dataFiles = [] }) {
  const fileCIDs = [];
  for (const f of dataFiles) {
    const cid = await uploadFileToPinata(
      f.buffer,
      f.originalname,
      { type: "mrv-file", reportId: report.projectId }
    );
    fileCIDs.push({ name: f.originalname, cid: `ipfs://${cid}` });
  }

  const bundle = {
    projectId:       report.projectId,
    carbonTonnes:    report.carbonTonnes,
    measurementDate: report.measurementDate,
    methodology:     report.methodology || "VERRA-VM0033",
    notes:           report.notes || "",
    attachments:     fileCIDs,
    submittedAt:     new Date().toISOString(),
  };

  const cid = await uploadJSONToPinata(bundle, `mrv-report-project-${report.projectId}`);
  return `ipfs://${cid}`;
}

/**
 * Retrieve metadata from IPFS via public gateway
 */
export async function fetchFromIPFS(cid) {
  const cleanCID = cid.replace("ipfs://", "");
  const response = await axios.get(
    `https://gateway.pinata.cloud/ipfs/${cleanCID}`,
    { timeout: 10000 }
  );
  return response.data;
}

export default { uploadFileToPinata, uploadJSONToPinata, pinProjectMetadata, pinMRVReport, fetchFromIPFS };
