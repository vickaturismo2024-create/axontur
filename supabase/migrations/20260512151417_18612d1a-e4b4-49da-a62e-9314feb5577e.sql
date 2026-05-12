-- Recalcula file_receipts.amount usando los items y sus TC.
-- Convención TC: rate = "1 service_currency = rate currency".
--   line.currency == receipt.currency               → suma amount
--   line.service_currency == receipt.currency + TC>0 → suma amount/rate
--   resto                                            → no se suma (queda log en notes? no, simplemente fuera)

UPDATE public.file_receipts r
SET amount = COALESCE(t.total, 0)
FROM (
  SELECT
    fri.receipt_id,
    SUM(
      CASE
        WHEN fri.currency = fr.currency THEN fri.amount
        WHEN fri.service_currency = fr.currency
             AND fri.exchange_rate IS NOT NULL
             AND fri.exchange_rate > 0
          THEN fri.amount / fri.exchange_rate
        ELSE 0
      END
    ) AS total
  FROM public.file_receipt_items fri
  JOIN public.file_receipts fr ON fr.id = fri.receipt_id
  GROUP BY fri.receipt_id
) t
WHERE r.id = t.receipt_id
  AND r.amount IS DISTINCT FROM ROUND(t.total::numeric, 2);