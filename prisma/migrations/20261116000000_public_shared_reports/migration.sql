CREATE POLICY shared_reports_public_lookup
ON shared_reports
FOR SELECT
USING (public_id = current_setting('app.public_report_id', true));
