# Public signup payment request payload

When the signup wizard submits card details, it calls [`initializePublicSignupPayment`](../src/lib/api.ts) to `POST` `/payments/initialize` with this JSON body:

```json
{
  "planId": "<selected plan id>",
  "billingPeriod": "MONTH" | "YEAR",
  "seatCount": <number of seats>,
  "account": {
    "firstName": "<admin first name>",
    "lastName": "<admin last name>",
    "email": "<admin email>",
    "password": "<admin password>",
    "phone": "<optional phone>"
  },
  "organization": {
    "organizationName": "<organization name>",
    "country": "<country>",
    "taxNumber": "<tax id>",
    "companySize": "<optional company size>"
  },
  "card": {
    "cardHolderName": "<name on card>",
    "cardNumber": "<digits only>",
    "expireMonth": <expiry month number>,
    "expireYear": <full expiry year number>,
    "cvc": "<cvc digits>"
  }
}
```

Notes:
- `cardNumber` is sanitized to digits only before sending (spaces and dashes are stripped).
- `expireMonth` and `expireYear` are sent as numbers.
- All fields are validated on the client against the schema in [`src/lib/types.ts`](../src/lib/types.ts) before the request is made.
