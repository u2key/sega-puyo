<?php
  function start_websocket_server() {
    global $server;
    $listen_address = "0.0.0.0";
    $listen_port = "8080";
    $cert_file = "/etc/letsencrypt/live/www.momiji.ip-ddns.com/fullchain.pem";
    $key_file = "/etc/letsencrypt/live/www.momiji.ip-ddns.com/privkey.pem";
    $context = stream_context_create([
      "ssl" => [
        "local_cert" => $cert_file,
        "local_pk" => $key_file,
        "allow_self_signed" => false,
        "verify_peer" => false
      ]
    ]);
    $server = stream_socket_server("ssl://{$listen_address}:{$listen_port}", $errno, $errstr, STREAM_SERVER_BIND | STREAM_SERVER_LISTEN, $context);
    if (!$server) {
      fwrite(STDERR, "Server start failed: {$errstr} ({$errno})\n");
      exit(1);
    }
    fwrite(STDOUT, "WebSocket server listening on {$listen_address}:{$listen_port}\n");
    stream_set_blocking($server, false);
  }
  function check_new_connection() {
    global $server, $clients, $handshaken;
    $client = @stream_socket_accept($server, -1);
    if ($client) {
      stream_set_blocking($client, false);
      $key = (int)$client;
      $clients[$key] = $client;
      $handshaken[$key] = false;
      fwrite(STDOUT, "New connection: {$key}\n");
    }
  }
  function create_handshake($key, $data, $r) {
    global $server, $clients, $handshaken;
    if (preg_match("/Sec-WebSocket-Key: (.*)\r\n/", $data, $matches)) {
      $sec_key = trim($matches[1]);
      $accept = base64_encode(sha1($sec_key . "258EAFA5-E914-47DA-95CA-C5AB0DC85B11", true));
      $upgrade_reply = 
        "HTTP/1.1 101 Switching Protocols\r\n".
        "Upgrade: websocket\r\n".
        "Connection: Upgrade\r\n".
        "Sec-WebSocket-Accept: {$accept}\r\n\r\n";
      fwrite($r, $upgrade_reply);
      $handshaken[$key] = true;
      fwrite(STDOUT, "Handshake successed: {$key}\n");
    } else {
      fclose($r);
      unset($clients[$key], $handshaken[$key]);
      fwrite(STDOUT, "Handshake failed: {$key}\n");
    }
  }
  function websocket_decode($data) {
    $length = ord($data[1]) & 127;
    if ($length === 126) {
      $masks = substr($data, 4, 4);
      $payload = substr($data, 8);
    } elseif ($length === 127) {
      $masks = substr($data, 10, 4);
      $payload = substr($data, 14);
    } else {
      $masks = substr($data, 2, 4);
      $payload = substr($data, 6);
    }
    $decoded = "";
    for ($i = 0; $i < strlen($payload); $i++) {
      $decoded .= $payload[$i] ^ $masks[$i % 4];
    }
    return $decoded;
  }
  function websocket_encode($data) {
    $frame = chr(129);
    $len = strlen($data);
    if ($len <= 125) {
      $frame .= chr($len);
    } elseif ($len <= 65535) {
      $frame .= chr(126) . pack("n", $len);
    } else {
      $frame .= chr(127) . pack("J", $len);
    }
    return $frame . $data;
  }
  function websocket_send($conn, string $message) {
    $data = websocket_encode($message);
    fwrite($conn, $data);
  }
?>
