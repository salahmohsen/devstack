export class DuckDBStore {
  constructor() {}
  get observability() {
    return undefined;
  }
  get db() {
    return undefined;
  }
  get stores() {
    return {};
  }
  close() {
    return Promise.resolve();
  }
}
