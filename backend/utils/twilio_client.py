from twilio.rest import Client

ACCOUNT_SID = "ACe8ae1627988301b26e50f2f82b518838"
AUTH_TOKEN = "d782918318ba2b8660f342d77c9be5ad"
TWILIO_NUMBER = "+1234567890"

client = Client(ACCOUNT_SID, AUTH_TOKEN)

def send_alert(to_number: str, message: str):
    try:
        client.messages.create(
            body=message,
            from_=TWILIO_NUMBER,
            to=to_number
        )
        return True
    except Exception as e:
        print("Twilio Error:", e)
        return False