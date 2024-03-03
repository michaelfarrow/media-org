import Queue, { QueueWorker } from 'queue';

const q = new Queue({ concurrency: 1, autostart: true });

export default function (job: QueueWorker) {
  q.push(async () => {
    try {
      return await job();
    } catch (e) {
      console.log('JOB error:', e);
    }
  });
}
