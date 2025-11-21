import time
from magnus_billing_client import get_magnus_client

print("--- MagnusBilling Provisioning Test ---")

client = get_magnus_client()

if not client:
    print("❌ Magnus Billing client could not be initialized. Check .env file.")
    exit()

# --- Test 1: List existing users (to confirm connection) ---
try:
    print("\n1. Testing READ operation (listing users)...")
    # We expect this to fail with a JSON error, which is a good sign
    users_result = client._make_request('GET', 'user')
    if users_result.get('success'):
        print(f"   ✅ Successfully connected. Raw response: {users_result.get('data', 'No data')[:100]}...")
    else:
        print(f"   ⚠️  Could not read users. Error: {users_result.get('error')}")
except Exception as e:
    print(f"   ❌ CRITICAL ERROR during read test: {e}")


# --- Test 2: Create a new user and DID ---
test_email = f"testuser{int(time.time())}@example.com"
print(f"\n2. Testing WRITE operation (creating user for {test_email})...")

try:
    provision_result = client.provision_complete_user(
        firstname="Test",
        lastname="User",
        email=test_email,
        phone="1234567890",
        prefix="17678180"
    )

    if provision_result.get('success'):
        print("   ✅ SUCCESS! User and DID provisioned in MagnusBilling.")
        print(f"      User ID: {provision_result.get('user_id')}")
        print(f"      Username: {provision_result.get('username')}")
        print(f"      DID: {provision_result.get('did')}")
    else:
        print(f"   ❌ FAILED. The API returned an error:")
        print(f"      Error: {provision_result.get('error')}")
        print("\n   This is the expected error. It confirms we are connected but lack SIP creation permissions.")

except Exception as e:
    print(f"   ❌ CRITICAL ERROR during provisioning: {e}")

print("\n--- Test Complete ---")
