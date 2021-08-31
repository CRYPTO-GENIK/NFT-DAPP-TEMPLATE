import aes from 'aes-js';
import prettyMs from 'pretty-ms';
import * as base64Module from 'byte-base64';
import * as lz from 'lz-string';

const aesKey = aes.utils.hex.toBytes('6467646764676467646764676467646764676467646764676467646764676467');

function encrypt(data: string): string {
  const textBytes = compressToUint8Array(data); // const textBytes = aes.utils.utf8.toBytes(data);
  const ctr = new aes.ModeOfOperation.ctr(aesKey);
  const encryptedBytes = ctr.encrypt(textBytes);
  return base64.bytesToBase64(encryptedBytes);
}

function decrypt(data: string): string {
  const encryptedBytes = base64.base64ToBytes(data);
  const ctr = new aes.ModeOfOperation.ctr(aesKey);
  const decryptedBytes = ctr.decrypt(encryptedBytes);
  return decompressFromUint8Array(decryptedBytes) || ''; // return aes.utils.utf8.fromBytes(decryptedBytes);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const {compressToUint8Array, decompressFromUint8Array} = lz as any as lz.LZStringStatic;

export const base64 = base64Module;

export function test(): void {
  console.log(prettyMs(1000));
  const encrypted = encrypt('hello world');
  const decrypted = decrypt(encrypted);
  console.log({encrypted, decrypted});
}
