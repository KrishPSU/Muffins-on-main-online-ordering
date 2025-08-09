const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const twilio = require('twilio');
const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');
const { Resend } = require('resend');

require('dotenv').config();


const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const resend = new Resend(process.env.RESEND_API_KEY); // replace with your key


async function sendEmail(to, subject, html) {
  // if (process.env.NODE_ENV === 'dev') {
  //   console.log('DEV mode - skipping email send.');
  //   return;
  // }

  if (!to || !subject || !html) {
    console.log('Not enough info, skipping email send.');
    return;
  }

  try {
    const data = await resend.emails.send({
      from: 'Muffins on Main Ordering <noreply@ordermuffinsonmain.com>', // this domain must be verified in Resend
      to: [`${to}`], // destination email(s)
      subject: subject,
      html: html,
    });

    console.log('✅ Email sent:', data);
    updateLogs(`✅ Email sent:${to}`);
  } catch (error) {
    console.error('❌ Error sending email:', error);
    updateLogs(`❌ Error sending email:${to}`);
  }
}



webpush.setVapidDetails(
  `mailto:${process.env.PERSONAL_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const activeOrders = {};         // { name: socketId }
const subscriptions = {}; // { name: PushSubscription }



// const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const PORT = process.env.PORT || 3000;



const basicAuth = require('express-basic-auth');



// Middleware
const app = express();
const server = http.createServer(app);
// const io = new Server(server);

const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ["https://ordermuffinsonmain.com"]
      : ["http://localhost:3000", "http://localhost:5000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['polling', 'websocket']
});

app.use(bodyParser.json());
//app.use(express.static(path.join(__dirname, 'app'))); // Serve static files from /app
app.use('/', express.static(path.join(__dirname, 'app')));
app.use('/admin', express.static(path.join(__dirname, 'edit-menu-app')));
app.use('/order_confirmed/:orderNum', express.static(path.join(__dirname, 'order-confirm')));
app.use('/view_order_status/:orderId', express.static(path.join(__dirname, 'view-order-status')));

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'app', 'index.html'));
});

app.use('/admin', basicAuth({
  users: { 'admin': '1234' },
  challenge: true
}));
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'edit-menu-app', 'edit-menu.html'));
});

app.get('/view_order_status/:orderId', async (req, res) => {
  res.sendFile(path.join(__dirname, 'view-order-status', 'order-status.html'));
});

app.get('/order_confirmed/:orderNum', (req, res) => {
  res.sendFile(path.join(__dirname, 'order-confirm', 'order-confirm.html'));
});




app.get('/api/order-status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: 'Invalid order id' });
    }

    // Adjust table and column names to match your schema
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (error) {
      // No rows found
      return res.status(404).json({ error: 'Order not found' });
    }

    // You can transform fields here if needed
    // Example: ensure pickup time is ISO string
    // if (data.client_order_pickup instanceof Date) {
    //   data.client_order_pickup = data.client_order_pickup.toISOString();
    // }

    return res.json(data);
  } catch (err) {
    console.error('Route error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});




app.post('/api/orders', async (req, res) => {
  const order = req.body;

  const orderNum = req.body.client_order_num;
  const name = req.body.client_name;
  const email = req.body.client_email;
  const pickup_date = req.body.client_order_pickup.split('T')[0];
  const pickup_time = req.body.client_order_pickup.split('T')[1].slice(0, 5); // Extract HH:MM from the datetime string
  const items = req.body.client_order;
  const subtotal = req.body.client_subtotal;
  const tax = req.body.client_tax;
  const final_total = req.body.client_final_total;

  // Basic validation
  if (!orderNum || !name || !email || !pickup_date || !pickup_time || !items || items.length === 0 || !subtotal || !tax || !final_total || subtotal == 0 || tax == 0 || final_total == 0) {
    return res.status(400).json({ error: 'Invalid order data.' });
  }

  // console.log('Received order:', { name, email, items, subtotal, tax, final_total });

  try {
    const { data, error } = await supabase
      .from('orders')
      .insert([
        {
          client_order_num: orderNum,
          client_name: name,
          client_email: email,
          client_order_pickup: `${pickup_date}T${pickup_time}:00`,
          client_order: items,
          client_subtotal: subtotal,
          client_tax: tax,
          client_final_total: final_total
        }
      ])
      .select()

    if (error) {
      console.error('Insert error:', error);
      res.status(500).json({ error: 'There was a problem saving your order.' });
    } else {
      sendConfirmationEmail(data[0].id, name, email, orderNum, pickup_date, pickup_time, items, subtotal, tax, final_total);
      updateLogs(`ORDER_RECEIVED`, `Order received from ${name} (${email}) for pickup on ${pickup_date} at ${pickup_time}. Items: ${JSON.stringify(items)}`);
      console.log('Inserted order:', data);
      res.status(201).json({ message: 'Order received and email sent.' });
      io.emit('new-order', data[0]);
      console.log(`registered ${name}`);
      activeOrders[orderNum] = data[0].id;
      console.log(data[0].id);
    }

  } catch (err) {
    console.error('Email error:', err);
    res.status(500).json({ error: 'Order received, but email failed to send.' });
  }
});



// GET /menu → serve the JSON
app.get('/api/menu', async (req, res) => {


  const { data, error } = await supabase
      .from('menu_items')
      .select('*')

  if (error) {
    console.error('Failed to read menu.json:', error);
    return res.status(500).json({ error: 'Failed to load menu' });
  }

  // console.log('Menu data:', data);

  // res.json(data);

  const groupedByCategory = {};
  data.forEach(item => {
    const category = item.category;
    if (!groupedByCategory[category]) {
      groupedByCategory[category] = [];
    }
    groupedByCategory[category].push(item);
  });

  // console.log(groupedByCategory);
  return res.json({
    data: data,
    groupedByCategory: groupedByCategory
  });
});



async function updateLogs(for_, msg) {
  const { data, error } = await supabase
    .from('logs')
    .insert({ for: for_, message: msg })
}




io.on('connection', (socket) => {
  console.log("connection: ", socket.id);
  
  // updateLogs(`CONNECTION`, `New connection: ${socket.id}`);

  socket.on('get-order-data', async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('complete', false)

    if (error) {
      console.error('order-data-retrieval-err:', error);
      return;
    }
    socket.emit('load-order-data', data);
  });

  socket.on('order-complete', async (orderId, name) => {
    const { data, error } = await supabase
      .from('orders')
      .update({ complete: true })
      .eq('id', orderId)

    if (error) {
      console.error('order-complete-err:', error);
      return;
    }

    updateLogs(`ORDER_COMPLETE`, `Order ${orderId} completed for ${name}`);
  });



  socket.on('add-menu-item', async (newItem) => {
    const { data, error } = await supabase
      .from('menu_items')
      .insert({ name: newItem.name, description: newItem.description, price: newItem.price, hidden: newItem.hidden, category: newItem.category })
      .select()

    if (error) {
      console.error('add-menu-item-err:', error);
      return;
    }

    // Emit the new item to all connected clients
    io.emit('menu-item-added', data[0]);
  });




  socket.on('update-menu-item', async (updatedItem) => {
    const { data, error } = await supabase
      .from('menu_items')
      .update({ name: updatedItem.name, description: updatedItem.description, price: updatedItem.price, hidden: updatedItem.hidden, category: updatedItem.category })
      .eq('id', updatedItem.id)
      .select()

    if (error) {
      console.error('update-menu-item-err:', error);
      return;
    }

    // Emit the updated item to all connected clients
    io.emit('menu-item-updated', data[0]);
  });




  socket.on('toggle-item-visibility', async (id, hidden) => {
    const { data, error } = await supabase
      .from('menu_items')
      .update({ hidden: hidden })
      .eq('id', id)
      .select()

    if (error) {
      console.error('toggle-item-visibility-err:', error);
      return;
    }

    // Emit the visibility change to all connected clients
    io.emit('item-visibility-toggled', data[0]);
  });




  socket.on('delete-item', async (id) => {
    const { data, error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)
      .select()

    if (error) {
      console.error('delete-menu-item-err:', error);
      return;
    }

    // Emit the deleted item to all connected clients
    io.emit('menu-item-deleted', id);
  });







  // Handle push subscription saving

  socket.on('save-subscription', (name, subscription, orderNum) => {
    console.log(`subscription for ${name} saved`);
    subscriptions[orderNum] = subscription;
  });


  socket.on('send-notification', (orderId, clientName, orderNum, email) => {
    const title = `Your order is ready!`;
    const message = `Hi ${clientName}, order #${orderNum} is ready for pickup.`;


    console.log(`trying to send to ${clientName} | ${title} --> ${message}`);

    const subscription = subscriptions[orderNum];
    sendPing(subscription, clientName.toLowerCase(), title, message, orderId, orderNum);
    sendOrderCompleteEmail(email, orderNum);
  });



  async function sendPing(subscription, to, title, message, orderId, orderNum) {
    if (subscription) {
      const payload = JSON.stringify({
        title: title,
        body: message
      });
      webpush.sendNotification(subscription, payload).catch(console.error);
      console.log(`Noti sent to ${to}`);
      socket.emit('registered-and-sent', orderId, to);

      // remove from activeOrders and subscriptions
      delete activeOrders[orderNum];
      delete subscriptions[orderNum];

      console.log(activeOrders);
      console.log(subscriptions);

    } 
    // else {
    //   socket.emit('not-registered-for-notis', to);
    // }
  }



});





function sendOrderCompleteEmail(email, orderNum) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Ready</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f9fafb; font-family:Arial, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f9fafb; padding:20px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff; border-radius:8px; overflow:hidden;">
              <!-- Header -->
              <tr>
                <td align="center" style="padding:20px; background-color:#22c55e;">
                  <span style="font-size:50px; color:#ffffff;">✔</span>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:30px; text-align:center;">
                  <h1 style="margin:0; font-size:22px; color:#111827;">Your Order is Ready for Pickup</h1>
                  <p style="margin:12px 0 20px; font-size:15px; color:#4b5563; line-height:1.5;">
                    Thank you for ordering from Muffins on Main! Your order is now ready.  
                    Please come pick it up at your earliest convenience.
                  </p>
                  <p style="margin:0; font-size:15px; color:#4b5563;">Order Number:</p>
                  <p style="margin:6px 0 20px; display:inline-block; padding:8px 14px; background-color:#f3f4f6; border-radius:6px; font-size:15px; font-weight:bold; color:#111827;">
                    #${orderNum}
                  </p>
                  <p style="margin:0; font-size:14px; color:#6b7280; line-height:1.5;">
                    If you have any questions, email or call us at<br> <strong>info@muffinsonmain.com</strong> | <strong>(978) 788-4365</strong>.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding:16px; background-color:#f3f4f6; text-align:center; font-size:12px; color:#6b7280;">
                  Muffins on Main • 40 Main St • Westford, MA 01886
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  sendEmail(email, `MoM Order Confirmation #${orderNum}`, html);
}


function sendConfirmationEmail(orderId, name, email, orderNum, pickup_date, pickup_time, items, subtotal, tax, final_total) {
  let itemsHtml = items.map(item => `
    <tr>
      <td style="padding:12px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#111827; border-bottom:1px solid #f3f4f6;">
        ${item.item}
      </td>
      <td style="padding:12px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#111827; border-bottom:1px solid #f3f4f6;" align="right">
        ${item.price}
      </td>
    </tr>
    `
  ).join('');



  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="x-apple-disable-message-reformatting">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Order Confirmation</title>
      <style>
        /* Mobile tweaks (works in most modern clients; ignored by some) */
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; }
          .px-24 { padding-left: 16px !important; padding-right: 16px !important; }
          .py-24 { padding-top: 16px !important; padding-bottom: 16px !important; }
          .stack { display: block !important; width: 100% !important; }
          .text-right { text-align: left !important; }
        }
      </style>
    </head>
    <body style="margin:0; padding:0; background:#f5f7fb;">
      <!-- Preheader (hidden preview text) -->
      <div style="display:none; font-size:1px; color:#f5f7fb; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
        Your order ${orderNum} has been confirmed. Thanks for ordering from Muffins on Main!
      </div>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f5f7fb;">
        <tr>
          <td align="center" style="padding:24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" class="container" style="width:600px; background:#ffffff; border-radius:8px; overflow:hidden;">
              <!-- Header -->
              <tr>
                <td align="center" style="background:white; padding:24px;">
                  <!-- Logo -->
                  <a href="https://ordermuffinsonmain.com" style="text-decoration:none;">
                    <img src="https://ordermuffinsonmain.com/images/MoM-logo-white-red.png" width="140" height="140" alt="Muffins on Main" style="display:block; border:0; outline:none; text-decoration:none; border-radius:8px;">
                  </a>
                </td>
              </tr>

              <!-- Title -->
              <tr>
                <td class="px-24 py-24" style="padding:24px; text-align: center;">
                  <h1 style="margin:0 0 8px; font-family:Arial, Helvetica, sans-serif; font-size:22px; line-height:28px; color:#111827;">
                    Order Confirmed ✅
                  </h1>
                  <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:20px; color:#4b5563;">
                    Hi ${name}, thanks for your order! We’re getting it ready. You’ll receive an email when it’s done!
                  </p>
                  <p style="margin:8px 0 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:18px; color:#6b7280;">
                    Order #<strong>${orderNum}</strong>
                  </p>
                </td>
              </tr>

              <!-- Order Summary -->
              <tr>
                <td class="px-24" style="padding:0 24px 8px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
                    <tr>
                      <td colspan="2" style="padding:12px 0; border-bottom:1px solid #e5e7eb;">
                        <strong style="font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#111827;">Order Summary</strong>
                      </td>
                    </tr>

                    ${itemsHtml}

                    <!-- Totals -->
                    <tr>
                      <td style="padding:12px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#6b7280;">
                        Subtotal
                      </td>
                      <td align="right" style="padding:12px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#111827;">
                        $${subtotal}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:0 0 12px; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#6b7280;">
                        Tax
                      </td>
                      <td align="right" style="padding:0 0 12px; font-family:Arial, Helvetica, sans-serif; font-size:14px; color:#111827;">
                        $${tax}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#111827; border-top:1px solid #e5e7eb;">
                        <strong>Total</strong>
                      </td>
                      <td align="right" style="padding:12px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; color:#111827; border-top:1px solid #e5e7eb;">
                        <strong>$${final_total}</strong>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Pickup/Delivery Block -->
              <tr>
                <td class="px-24" style="padding:0 24px 24px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:6px;">
                    <tr>
                      <td style="padding:16px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:20px; color:#111827; text-align:center;">
                        <span style="color:#6b7280;">Estimated to be ready by:</span> <br> <b>${pickup_date} at ${pickup_time}</b>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- CTA -->
              <tr>
                <td align="center" style="padding:0 24px 24px; color:#FFFFFF">
                  <a href="http://ordermuffinsonmain.com/view_order_status/${btoa(orderId)}" style="display:inline-block; background:#e74c3c; color:#FFFFFF; text-decoration:none; font-weight:bold; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:44px; height:44px; padding:0 18px; border-radius:6px;">
                    View your order
                  </a>
                </td>
              </tr>

              <!-- Contact / Footer -->
              <tr>
                <td class="px-24" style="padding:0 24px 24px; text-align: center;">
                  <p style="margin:0 0 6px; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:18px; color:#6b7280;">
                    Questions? call or email us at <br> <strong>+1 (978) 788-4365</strong> | <strong>info@muffinsonmain.com</strong>.
                  </p>
                  <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:18px; color:#9ca3af;">
                    Muffins on Main • 40 Main St • Westford, MA 01886
                  </p>
                </td>
              </tr>

              <tr>
                <td align="center" style="background:#f3f4f6; padding:16px;">
                  <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#6b7280;">
                    © ${new Date().getFullYear()} Muffins on Main. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>

            <!-- Text-only fallback suggestion -->
            <div style="width:600px; max-width:100%; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#9ca3af; padding:12px 0;">
              If you’re having trouble viewing this email, <a href="http://ordermuffinsonmain.com/view_order_status/${btoa(orderId)}" style="color:#6b7280;">view your order online</a>.
            </div>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  sendEmail(email, `MoM Order Confirmation #${orderNum}`, html);
}





// Start server
server.listen(PORT || 3000, () => {
  console.log(`Server running on port ${PORT || 3000}`)
});
