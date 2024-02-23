export default interface Options {
  /**
   * Write debugging output to the console?
   * @default false
   */
  debug?: boolean;
  /**
   * If stdio should be piped to the current console, useful for figuring out issues with ffmpeg
   * @default false
   */
  pipeStdio?: boolean;
  /**
   * Clear any tags not specified
   * @default false
   */
  clear?: boolean;
}
