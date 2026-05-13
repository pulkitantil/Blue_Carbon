export const User = { find: async () => [], create: async () => ({}), findById: async () => null, save: async () => ({}), findOne: async () => null, findOneAndUpdate: async () => ({}), }; 
export const ProjectCache = { find: async () => [], create: async () => ({}), findOne: async () => null, findOneAndUpdate: async () => ({}), aggregate: async () => [], countDocuments: async () => 0, };
export const MRVReportCache = { find: async () => [], create: async () => ({}), findOne: async () => null, findOneAndUpdate: async () => ({}), };
export const IssuanceLog = { find: async () => [], create: async () => ({}), };
export const RetirementLog = { find: async () => [], create: async () => ({}), };
export default { User, ProjectCache, MRVReportCache, IssuanceLog, RetirementLog };
