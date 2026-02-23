// /**
//  * Converts protobuf wrapper types (StringValue, Int32Value, etc.) to plain JavaScript values
//  * Also handles nested objects, arrays, and Timestamp objects recursively
//  * 
//  * Example:
//  * Input:  { id: { value: '123' }, name: { value: 'John' }, ngaySinh: { seconds: 818467200n, nanos: 0 } }
//  * Output: { id: '123', name: 'John', ngaySinh: '1995-12-25T00:00:00Z' }
//  */

// // List of protobuf wrapper type field names to unwrap
// const WRAPPER_FIELDS = ['value'];

// // Fields that contain Timestamp objects
// // Include common Vietnamese field names and English variations
// const TIMESTAMP_FIELDS = [
//     'ngaySinh', 'ngayTao', 'ngaySua', 'ngayTaoDu', 'ngaySuaDu',
//     'createDate', 'modifyDate', 'updateDate', 'deleteDate',
//     'createdDate', 'modifiedDate', 'updatedDate',
//     'dateCreated', 'dateModified', 'dateUpdated',
//     'ngayXoa', 'ngayThay', 'ngayBatDau', 'ngayKetThuc'
// ];

// /**
//  * Check if an object is a protobuf wrapper type
//  * Wrapper types have a single 'value' property
//  */
// function isProtobufWrapper(obj: any): boolean {
//     if (obj === null || obj === undefined) return false;
//     if (typeof obj !== 'object') return false;
    
//     const keys = Object.keys(obj);
    
//     // Check if it's a simple wrapper with only 'value' property
//     return keys.length === 1 && keys[0] === 'value';
// }

// /**
//  * Check if an object is a protobuf Timestamp
//  * Timestamp has 'seconds' and optionally 'nanos' properties
//  */
// function isProtobufTimestamp(obj: any, fieldName?: string): boolean {
//     if (obj === null || obj === undefined) return false;
//     if (typeof obj !== 'object') return false;
    
//     // If we have a field name, check if it's a timestamp field
//     if (fieldName && !TIMESTAMP_FIELDS.includes(fieldName)) {
//         return false;
//     }
    
//     const keys = Object.keys(obj);
    
//     // Check if it has 'seconds' property (BigInt or number)
//     return 'seconds' in obj && (typeof obj.seconds === 'bigint' || typeof obj.seconds === 'number');
// }

// /**
//  * Convert a protobuf Timestamp to ISO date string
//  * Handles both BigInt and number types for seconds
//  */
// function convertTimestamp(timestamp: any): string {
//     if (!timestamp || typeof timestamp !== 'object') {
//         return '';
//     }
    
//     try {
//         // Convert BigInt seconds to number
//         const seconds = typeof timestamp.seconds === 'bigint' 
//             ? Number(timestamp.seconds) 
//             : timestamp.seconds;
        
//         // Convert to milliseconds and create Date
//         const date = new Date(seconds * 1000);
        
//         // Return ISO string
//         return date.toISOString();
//     } catch (error) {
//         console.warn('Failed to convert timestamp:', timestamp, error);
//         return '';
//     }
// }

// /**
//  * Recursively convert protobuf wrapper types to plain values
//  */
// function unwrapValue(value: any, fieldName?: string): any {
//     // Handle null/undefined
//     if (value === null || value === undefined) {
//         return value;
//     }
    
//     // Handle primitives
//     if (typeof value !== 'object') {
//         return value;
//     }
    
//     // Handle arrays
//     if (Array.isArray(value)) {
//         return value.map(item => unwrapValue(item, fieldName));
//     }
    
//     // Handle protobuf Timestamp objects
//     if (isProtobufTimestamp(value, fieldName)) {
//         return convertTimestamp(value);
//     }
    
//     // Handle protobuf wrapper types
//     if (isProtobufWrapper(value)) {
//         return unwrapValue(value.value, fieldName);
//     }
    
//     // Handle regular objects - recursively unwrap all properties
//     const result: any = {};
    
//     for (const [key, val] of Object.entries(value)) {
//         // Skip internal protobuf fields
//         if (key.startsWith('$') || key === '__proto__') {
//             continue;
//         }
        
//         result[key] = unwrapValue(val, key);
//     }
    
//     return result;
// }

// /**
//  * Convert an array of items with wrapped values to plain values
//  * Useful for converting API response data
//  */
// export function unwrapArray<T>(items: any[]): T[] {
//     if (!Array.isArray(items)) {
//         return [];
//     }
    
//     return items.map(item => unwrapValue(item) as T);
// }

// /**
//  * Convert a single item with wrapped values to plain values
//  */
// export function unwrapItem<T>(item: any): T {
//     return unwrapValue(item) as T;
// }

// /**
//  * Main export - unwrap function that handles both single items and arrays
//  */
// export function unwrapProtobufValues<T>(data: any): T | T[] {
//     if (Array.isArray(data)) {
//         return unwrapArray<T>(data);
//     }
    
//     return unwrapItem<T>(data);
// }

// /**
//  * Convenience function for unwrapping before storing in Redux
//  * Use in your thunks like this:
//  * const list = unwrapProtobufValues(data).map((item, idx) => ({
//  *     index: idx + 1,
//  *     ...item
//  * }));
//  */
// export function unwrapForRedux<T>(data: any): T[] {
//     if (Array.isArray(data)) {
//         return unwrapArray<T>(data);
//     }
    
//     return [unwrapItem<T>(data)];
// }

// // Export the main unwrap function as default for convenience
// export default unwrapProtobufValues;