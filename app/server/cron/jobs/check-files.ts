import { CronJob } from 'cron';
import CronTime from 'cron-time-generator';
import queue from '@server/lib/queue';
import checkFiles from '@server/jobs/check-files';

export default () => {
  return CronJob.from({
    cronTime: CronTime.everyHour(),
    onTick: function () {
      queue(checkFiles);
    },
    start: true,
  });
};
