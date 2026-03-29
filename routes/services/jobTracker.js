const jobs = new Map();

function createJob(jobId) {
  jobs.set(jobId, {
    id: jobId,
    status: 'started',
    progress: 0,
    step: 'Initializing...',
    steps: [],
    error: null,
    outputFile: null,
    createdAt: new Date().toISOString()
  });
  return jobs.get(jobId);
}

function updateJob(jobId, update) {
  const job = jobs.get(jobId);
  if (!job) return;
  Object.assign(job, update);
  if (update.step) {
    job.steps.push({ step: update.step, time: new Date().toISOString() });
    console.log(`[${jobId}] ${update.step}`);
  }
  jobs.set(jobId, job);
}

function getJob(jobId) {
  return jobs.get(jobId) || null;
}

function deleteJob(jobId) {
  jobs.delete(jobId);
}

module.exports = { createJob, updateJob, getJob, deleteJob };
