"""
x402 Payment Protocol - Python Example

Demonstrates how to use x402 from Python-based AI agents.
"""

import os
import json
import time
import base64
import hashlib
import requests
from typing import Dict, Any, Optional
from nacl.signing import SigningKey
from nacl.encoding import Base58Encoder


class X402Client:
    """Python client for x402 payment protocol"""

    def __init__(self, api_url: str, secret_key_base58: str):
        """
        Initialize x402 client

        Args:
            api_url: Base URL of the API (e.g., 'http://localhost:3000/api')
            secret_key_base58: Wallet secret key (base58 encoded, 64 bytes)
        """
        self.api_url = api_url.rstrip('/')
        self.signing_key = SigningKey(secret_key_base58, encoder=Base58Encoder)
        self.public_key = self.signing_key.verify_key.encode(encoder=Base58Encoder).decode()

    def create_payment_intent(
        self,
        amount: int,
        job_id: str,
        expires_in: int = 300
    ) -> Dict[str, Any]:
        """
        Create and sign a payment intent

        Args:
            amount: Payment amount in lamports
            job_id: Job identifier
            expires_in: Expiration time in seconds (default: 5 minutes)

        Returns:
            Signed payment intent
        """
        import datetime

        timestamp = datetime.datetime.utcnow().isoformat() + 'Z'

        # Create message to sign
        message = f"x402-payment:{self.public_key}:{amount}:{job_id}:{timestamp}:{expires_in}"

        # Sign the message
        signature = self.signing_key.sign(message.encode())
        signature_base58 = base64.b58encode(signature.signature).decode()

        # Generate intent ID (deterministic hash)
        intent_id_hash = hashlib.sha256(message.encode()).digest()[:16]
        intent_id = base64.b58encode(intent_id_hash).decode()

        return {
            'id': intent_id,
            'payer': self.public_key,
            'amount': amount,
            'jobId': job_id,
            'timestamp': timestamp,
            'expiresIn': expires_in,
            'signature': signature_base58,
        }

    def submit_job(
        self,
        job_type: str,
        config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Submit a job with automatic payment

        Args:
            job_type: Type of job (e.g., 'inference_medium')
            config: Job configuration

        Returns:
            Job status
        """
        # Get pricing
        pricing = self.get_pricing(job_type)

        # Create payment intent
        intent = self.create_payment_intent(
            pricing['minimumPayment'],
            f"job_{int(time.time())}"
        )

        # Create submission
        submission = {
            'payment': intent,
            'jobType': job_type,
            'config': config,
        }

        # Create headers
        headers = {
            'Content-Type': 'application/json',
            'X-Payment-Intent-ID': intent['id'],
            'X-Payer': intent['payer'],
            'X-Payment-Signature': intent['signature'],
            'X-Payment-Amount': str(intent['amount']),
            'X-Job-ID': intent['jobId'],
            'X-Timestamp': intent['timestamp'],
            'X-Expires-In': str(intent['expiresIn']),
        }

        # Submit to API
        response = requests.post(
            f"{self.api_url}/x402",
            json=submission,
            headers=headers,
            timeout=30,
        )

        if not response.ok:
            error = response.json()
            raise Exception(f"Job submission failed: {error.get('message', response.text)}")

        return response.json()

    def get_job_status(self, job_id: str) -> Dict[str, Any]:
        """
        Get job status

        Args:
            job_id: Job identifier

        Returns:
            Job status
        """
        response = requests.get(
            f"{self.api_url}/x402/jobs/{job_id}",
            timeout=10,
        )

        if not response.ok:
            raise Exception(f"Failed to get job status: {response.text}")

        return response.json()

    def wait_for_completion(
        self,
        job_id: str,
        poll_interval: int = 5,
        max_wait: int = 300
    ) -> Dict[str, Any]:
        """
        Wait for job to complete

        Args:
            job_id: Job identifier
            poll_interval: Polling interval in seconds
            max_wait: Maximum wait time in seconds

        Returns:
            Completed job status
        """
        start_time = time.time()

        while time.time() - start_time < max_wait:
            status = self.get_job_status(job_id)

            if status['status'] == 'completed':
                return status

            if status['status'] in ['failed', 'cancelled']:
                raise Exception(f"Job {status['status']}: {status.get('error', 'Unknown')}")

            time.sleep(poll_interval)

        raise Exception(f"Job {job_id} did not complete within {max_wait}s")

    def get_pricing(self, job_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Get pricing information

        Args:
            job_type: Optional job type, or None for all pricing

        Returns:
            Pricing information
        """
        url = f"{self.api_url}/x402/pricing"
        if job_type:
            url += f"?jobType={job_type}"

        response = requests.get(url, timeout=10)

        if not response.ok:
            raise Exception(f"Failed to get pricing: {response.text}")

        return response.json()


def main():
    """Example usage"""
    print("🚀 x402 Payment Protocol - Python Example\n")

    # Initialize client
    # In production, load from environment variable
    secret_key = os.getenv('SOLANA_SECRET_KEY', 'DEMO_KEY_BASE58_ENCODED')

    client = X402Client(
        api_url='http://localhost:3000/api',
        secret_key_base58=secret_key,
    )

    print(f"Client initialized for: {client.public_key}\n")

    # Get pricing
    try:
        print("Fetching pricing...")
        pricing = client.get_pricing('inference_medium')
        print(f"  Job Type: {pricing['jobType']}")
        print(f"  Price: {pricing['minimumPayment']} lamports")
        print(f"  GPU: {pricing['resources']['gpu']}\n")
    except Exception as e:
        print(f"  ⚠️  Pricing API error: {e}\n")

    # Submit job
    try:
        print("Submitting job...")
        job = client.submit_job('inference_medium', {
            'model': 'llama-3-70b',
            'input': {
                'prompt': 'Explain quantum computing',
                'max_tokens': 500,
            },
        })

        print(f"  ✅ Job submitted: {job['jobId']}")
        print(f"  Status: {job['status']}\n")

        # Wait for completion
        print("Waiting for completion...")
        result = client.wait_for_completion(job['jobId'])
        print(f"  ✅ Completed!")
        print(f"  Result: {json.dumps(result.get('result'), indent=2)}")
    except Exception as e:
        print(f"  ⚠️  Job error: {e}")

    print("\n✨ Example completed!")


if __name__ == '__main__':
    main()
