use aes::cipher::{KeyIvInit, StreamCipher};

type Aes256Ctr = ctr::Ctr64BE<aes::Aes256>;

/// Encrypt (or decrypt — AES-CTR is symmetric) a chunk of data at a given byte offset.
/// The offset determines the IV counter position, enabling random-access decryption.
pub fn encrypt_chunk(key: &[u8; 32], offset: u64, data: &mut [u8]) {
    let mut iv = [0u8; 16];
    let block_num = offset / 16;
    iv[8..16].copy_from_slice(&block_num.to_be_bytes());
    let mut cipher = Aes256Ctr::new(key.into(), &iv.into());
    let skip = (offset % 16) as usize;
    if skip > 0 {
        let mut discard = vec![0u8; skip];
        cipher.apply_keystream(&mut discard);
    }
    cipher.apply_keystream(data);
}
