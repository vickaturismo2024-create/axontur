const { createClient } = require('@supabase/supabase-js');

const url = "https://hdeyzjfyewabypbgadsz.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhkZXl6amZ5ZXdhYnlwYmdhZHN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NTkwNjIsImV4cCI6MjA5NDUzNTA2Mn0.dzrQO_qdGLMfemklUINm1wo10LGOvdtASG57IbZsvss";

const supabase = createClient(url, key);

async function test() {
  console.log("Fetching file_receipt_items...");
  const { data: items, error: iError } = await supabase
    .from('file_receipt_items')
    .select('amount, currency, receipt_id');
  
  console.log("Items count:", items?.length, "Error:", iError);

  console.log("Fetching file_receipts...");
  const { data: receipts, error: rError } = await supabase
    .from('file_receipts')
    .select('id, status');

  console.log("Receipts count:", receipts?.length, "Error:", rError);

  if (items && receipts) {
    const statusMap = new Map(receipts.map(r => [r.id, r.status]));
    console.log("Status map size:", statusMap.size);
    let totalUSD = 0;
    items.forEach(it => {
      const status = statusMap.get(it.receipt_id);
      if (status !== 'cancelled') {
        if (it.currency === 'USD') totalUSD += Number(it.amount);
      }
    });
    console.log("Total USD (not cancelled):", totalUSD);
  }
}

test();
