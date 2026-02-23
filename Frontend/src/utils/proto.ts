// // src/utils/proto.ts
// import { Timestamp } from "google-protobuf/google/protobuf/timestamp_pb";

// export const toTimestamp = (
//   value?: Date | string | null
// ): Timestamp | undefined => {
//   if (!value) return undefined;

//   const d = value instanceof Date ? value : new Date(value);
//   if (isNaN(d.getTime())) return undefined;

//   const ts = new Timestamp();
//   ts.setSeconds(Math.floor(d.getTime() / 1000));
//   ts.setNanos((d.getTime() % 1000) * 1_000_000);
//   return ts;
// };

// export const fromTimestamp = (
//   ts?: Timestamp
// ): Date | null => {
//   if (!ts) return null;
//   return new Date(ts.getSeconds() * 1000);
// };
