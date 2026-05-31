<?php
$file = $_GET['file'] ?? '';
if (!preg_match('/^(static|products-\d+)$/', $file)) {
    http_response_code(404);
    exit;
}
$url = 'https://bqtzxoteoucvioxqgfpc.supabase.co/functions/v1/make-server-d1fbc049/sitemap-' . $file . '.xml';
$xml = file_get_contents($url);
if ($xml === false) {
    http_response_code(500);
    exit;
}
header('Content-Type: application/xml; charset=UTF-8');
header('Cache-Control: no-cache');
echo $xml;
