const aws = require('aws-sdk')
const ses = new aws.SES()
const myEmail = process.env.EMAIL
const myDomain = process.env.DOMAIN

function generateResponse (code, payload) {
  return {
    statusCode: code,
    headers: {
      'Access-Control-Allow-Origin': myDomain,
      'Access-Control-Allow-Headers': 'x-requested-with',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify(payload)
  }
}

function generateError (code, err) {
  console.log(err)
  return {
    statusCode: code,
    headers: {
      'Access-Control-Allow-Origin': myDomain,
      'Access-Control-Allow-Headers': 'x-requested-with',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify(err.message)
  }
}

// rendering selected additional services
function renderSelectedServices(services) {
  const serviceNames = services.map(x => x.Name);
  return serviceNames.join(', ');
}

// rendering discounts
function renderDiscounts(discounts) {
  return discounts.map(x => {
    return `\n  ${ x.FromWeek || 1 }${ x.ToWeek ? ` - ${x.ToWeek}` : '+' } Wochen: -${ x.Value }%`;
  });
}

function generateEmailParams (body) {
  const {
    machine,
    from,
    till,
    selectedServices,
    customerInfo,
    shippingAddress,
    consent,
    totalPrice,
  } = JSON.parse(body);

  const dateStringOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return {
    Source: myEmail,
    Destination: { ToAddresses: [myEmail] },
    //ReplyToAddresses: [email],
    Message: {
      Body: {
        Text: {
          Charset: 'UTF-8',
          Data: `

Neue Mietanfrage erhalten

Anfragedatum: ${(new Date()).toLocaleString('de-DE')}
Name: ${machine.name}
Kategorie: ${machine.category}
Grundpreis: ${machine.price.BasePrice} €
Rabattstruktur: ${renderDiscounts(machine.price.Discounts)}

Miete von: ${(new Date(from)).toLocaleDateString('de-DE', dateStringOptions)}
Miete bis: ${(new Date(till)).toLocaleDateString('de-DE', dateStringOptions)}

Gesamtpreis: ${totalPrice} €

Zusatzleistungen: ${renderSelectedServices(selectedServices)}

Kundeninformationen:
  Firma: ${customerInfo.company}
  Vorname: ${customerInfo.firstName}
  Nachname: ${customerInfo.lastName}
  Telefon: ${customerInfo.phone}
  E-Mail: ${customerInfo.email}

Lieferadresse:
  Anschrift: ${shippingAddress.address}
  Plz: ${shippingAddress.zip}
  Ort: ${shippingAddress.place}
  Land: ${shippingAddress.state}
  
Anbieter: ${machine.dealerName}

Einverständniserklärung: ${consent ? 'Ja' : 'Nein'}

          `,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: `Mietanfrage von ${machine.name}`,
      },
    },
  };
}

module.exports.send = async (event) => {
  try {
    const emailParams = generateEmailParams(event.body)
    const data = await ses.sendEmail(emailParams).promise()
    return generateResponse(200, data)
  } catch (err) {
    return generateError(500, err)
  }
}