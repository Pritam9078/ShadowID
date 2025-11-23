#!/usr/bin/env python3
"""
Document Hash Computation Helper (Python)
Computes SHA-256 hash of documents and converts to field elements for Noir circuits
"""

import hashlib
import json
import os
import sys
import argparse
from pathlib import Path
from typing import Dict, Tuple, Optional
import secrets

# BN254 field modulus (same as used in Noir circuits)
FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617

# Document type constants (matching circuit definitions)
DOC_TYPES = {
    'INCORPORATION_CERT': 1,
    'BUSINESS_LICENSE': 2,
    'TAX_CERTIFICATE': 3,
    'AUDIT_REPORT': 4,
    'FINANCIAL_STATEMENT': 5,
    'COMPLIANCE_CERT': 6,
    'REGISTRATION_FORM': 7,
    'IDENTITY_DOCUMENT': 8,
    'OWNERSHIP_PROOF': 9,
    'OTHER': 99
}

DOC_TYPE_NAMES = {
    1: 'Incorporation Certificate',
    2: 'Business License',
    3: 'Tax Certificate',
    4: 'Audit Report',
    5: 'Financial Statement',
    6: 'Compliance Certificate',
    7: 'Registration Form',
    8: 'Identity Document',
    9: 'Ownership Proof',
    99: 'Other'
}


def normalize_text_document(data: bytes) -> bytes:
    """Normalize text documents for canonical hashing"""
    try:
        text = data.decode('utf-8')
        
        # Normalize line endings to LF
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        
        # Trim trailing whitespace from lines
        lines = [line.rstrip() for line in text.split('\n')]
        text = '\n'.join(lines)
        
        # Remove final trailing newline if present
        text = text.rstrip('\n')
        
        return text.encode('utf-8')
    except UnicodeDecodeError:
        print("Warning: Text decoding failed, using raw bytes")
        return data


def normalize_json_document(data: bytes) -> bytes:
    """Normalize JSON documents for canonical hashing"""
    try:
        json_data = json.loads(data.decode('utf-8'))
        
        # Stringify with consistent formatting (no whitespace, sorted keys)
        normalized_json = json.dumps(json_data, separators=(',', ':'), sort_keys=True)
        
        return normalized_json.encode('utf-8')
    except (json.JSONDecodeError, UnicodeDecodeError):
        print("Warning: JSON parsing failed, using raw bytes")
        return data


def normalize_document(data: bytes, file_extension: str) -> bytes:
    """Apply document-type-specific normalization"""
    ext = file_extension.lower()
    
    if ext in ['.txt', '.md', '.csv']:
        return normalize_text_document(data)
    elif ext == '.json':
        return normalize_json_document(data)
    elif ext in ['.pdf', '.docx', '.xlsx', '.png', '.jpg', '.jpeg']:
        print(f"Warning: Binary file {ext} used without normalization")
        return data
    else:
        print(f"Warning: Unknown file type {ext}, using raw bytes")
        return data


def compute_document_hash(file_path: str, normalize: bool = True) -> Dict:
    """Compute SHA-256 hash of document and convert to field element"""
    path_obj = Path(file_path)
    
    if not path_obj.exists():
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Read file
    with open(file_path, 'rb') as f:
        file_data = f.read()
    
    file_size = len(file_data)
    file_extension = path_obj.suffix
    
    print(f"Processing file: {file_path}")
    print(f"File size: {file_size} bytes")
    print(f"File type: {file_extension or 'unknown'}")
    
    # Apply normalization if requested
    if normalize:
        print("Applying document normalization...")
        normalized_data = normalize_document(file_data, file_extension)
        
        if len(normalized_data) != file_size:
            print(f"Normalized size: {len(normalized_data)} bytes")
    else:
        normalized_data = file_data
    
    # Compute SHA-256 hash
    sha256_hash = hashlib.sha256(normalized_data).digest()
    hash_hex = sha256_hash.hex()
    
    print(f"SHA-256: {hash_hex}")
    
    # Convert to field element (big-endian interpretation)
    hash_int = int.from_bytes(sha256_hash, 'big')
    
    # Check field modulus constraint
    if hash_int >= FIELD_MODULUS:
        raise ValueError(f"Hash value exceeds BN254 field modulus. Hash: {hash_int}, Modulus: {FIELD_MODULUS}")
    
    field_element = str(hash_int)
    print(f"Field element: {field_element}")
    
    return {
        'file_path': file_path,
        'file_size': file_size,
        'normalized_size': len(normalized_data),
        'sha256_hex': hash_hex,
        'sha256_int': hash_int,
        'field_element': field_element,
        'normalized': normalize
    }


def generate_field_salt() -> str:
    """Generate cryptographically secure random salt as field element"""
    while True:
        # Generate 32 random bytes
        random_bytes = secrets.token_bytes(32)
        salt_int = int.from_bytes(random_bytes, 'big')
        
        # Ensure it fits in the field
        if salt_int < FIELD_MODULUS:
            return str(salt_int)


def create_commitment_placeholder(doc_hash_field: str, salt_field: str) -> str:
    """Create placeholder commitment (use actual Poseidon in production)"""
    # Placeholder implementation - use actual Poseidon hash in production
    combined = doc_hash_field + salt_field
    sha256_commitment = hashlib.sha256(combined.encode()).hexdigest()
    print("Warning: Using SHA-256 as Poseidon placeholder")
    return '0x' + sha256_commitment


def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(
        description='Document Hash Computation Helper',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Document Types:
  1  - Incorporation Certificate
  2  - Business License
  3  - Tax Certificate  
  4  - Audit Report
  5  - Financial Statement
  6  - Compliance Certificate
  7  - Registration Form
  8  - Identity Document
  9  - Ownership Proof
  99 - Other

Examples:
  python compute_document_hash.py document.pdf
  python compute_document_hash.py contract.json --type 7
  python compute_document_hash.py cert.pdf --no-normalize --salt 12345...
        '''
    )
    
    parser.add_argument('file_path', help='Path to document file')
    parser.add_argument('--no-normalize', action='store_true', 
                       help='Skip document normalization')
    parser.add_argument('--type', type=int, choices=range(1, 100),
                       help='Document type code (1-99)')
    parser.add_argument('--salt', type=str,
                       help='Use specific salt (field element as string)')
    
    args = parser.parse_args()
    
    try:
        # Compute document hash
        hash_info = compute_document_hash(args.file_path, not args.no_normalize)
        
        # Generate or use provided salt
        if args.salt:
            try:
                salt_field = str(int(args.salt))
                if int(args.salt) >= FIELD_MODULUS:
                    raise ValueError("Salt exceeds field modulus")
            except ValueError as e:
                print(f"Error: Invalid salt - {e}")
                sys.exit(1)
        else:
            salt_field = generate_field_salt()
        
        # Create commitment (placeholder implementation)
        commitment = create_commitment_placeholder(hash_info['field_element'], salt_field)
        
        doc_type = args.type or DOC_TYPES['OTHER']
        
        print('\n--- Circuit Inputs ---')
        print(f'doc_commitment = "{commitment}"')
        print(f'doc_type_code = "{doc_type}"')
        print(f'enable_type_check = "{1 if args.type else 0}"')
        print(f'doc_hash_raw = "{hash_info["field_element"]}"')
        print(f'salt = "{salt_field}"')
        print(f'expected_doc_type = "{doc_type}"')
        
        print('\n--- Summary ---')
        print(f"File: {hash_info['file_path']}")
        size_info = f"{hash_info['file_size']} bytes"
        if hash_info['normalized_size'] != hash_info['file_size']:
            size_info += f" ({hash_info['normalized_size']} normalized)"
        print(f"Size: {size_info}")
        print(f"SHA-256: {hash_info['sha256_hex']}")
        print(f"Field Element: {hash_info['field_element']}")
        print(f"Salt: {salt_field}")
        print(f"Commitment: {commitment}")
        type_info = f"{doc_type}"
        if args.type:
            type_info += f" ({DOC_TYPE_NAMES.get(doc_type, 'Unknown')})"
        else:
            type_info += " (Not specified)"
        print(f"Document Type: {type_info}")
        
        # Output Prover.toml format
        print('\n--- Prover.toml Format ---')
        print(f'# Generated from: {hash_info["file_path"]}')
        print(f'doc_commitment = "{commitment}"')
        print(f'doc_type_code = "{doc_type}"')
        print(f'enable_type_check = "{1 if args.type else 0}"')
        print(f'doc_hash_raw = "{hash_info["field_element"]}"')
        print(f'salt = "{salt_field}"')
        print(f'expected_doc_type = "{doc_type}"')
        
        # Save to file option
        output_file = f"{Path(args.file_path).stem}_prover.toml"
        with open(output_file, 'w') as f:
            f.write(f'# Generated from: {hash_info["file_path"]}\n')
            f.write(f'doc_commitment = "{commitment}"\n')
            f.write(f'doc_type_code = "{doc_type}"\n')
            f.write(f'enable_type_check = "{1 if args.type else 0}"\n')
            f.write(f'doc_hash_raw = "{hash_info["field_element"]}"\n')
            f.write(f'salt = "{salt_field}"\n')
            f.write(f'expected_doc_type = "{doc_type}"\n')
        
        print(f'\nProver inputs saved to: {output_file}')
        
    except Exception as error:
        print(f'Error: {error}')
        sys.exit(1)


if __name__ == '__main__':
    main()