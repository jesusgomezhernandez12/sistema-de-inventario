<?php
class Database {
    private static $instance = null;
    private $url;
    private $token;
    private $lastInsertId = null;
    
    private function __construct() {
        $this->url = $_ENV['TURSO_DATABASE_URL'] ?? 'libsql://inventario-ganadero-jesusgomezhernandez12.aws-us-west-2.turso.io';
        $this->token = $_ENV['TURSO_AUTH_TOKEN'] ?? '';
        
        if (empty($this->token)) {
            // Try loading from .env if not set
            if (file_exists(__DIR__ . '/../../.env')) {
                $env = parse_ini_file(__DIR__ . '/../../.env');
                $this->token = $env['TURSO_AUTH_TOKEN'] ?? '';
                $this->url = $env['TURSO_DATABASE_URL'] ?? $this->url;
            }
        }
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function getApiUrl() {
        $url = $this->url;
        if (strpos($url, 'libsql://') === 0) {
            $url = 'https://' . substr($url, 9);
        }
        return rtrim($url, '/') . '/v2/pipeline';
    }
    
    private function tursoRequest($sql, $args = []) {
        $payload = [
            'requests' => [
                [
                    'type' => 'execute',
                    'stmt' => [
                        'sql' => $sql,
                        'args' => $args
                    ]
                ]
            ]
        ];
        
        $ch = curl_init($this->getApiUrl());
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $this->token
        ]);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $data = json_decode($response, true);
        
        if ($httpCode !== 200 && isset($data['error'])) {
            throw new Exception('Turso error: ' . $data['error']);
        }
        
        return $data['results'][0] ?? null;
    }
    
    public function prepare($sql) {
        return new TursoStatement($this, $sql);
    }
    
    public function query($sql) {
        $result = $this->tursoRequest($sql);
        if ($result && isset($result['rows'])) {
            return new TursoResult($result['rows'], $result['lastInsertRowid'] ?? null, $result['rowsAffected'] ?? 0);
        }
        return new TursoResult([], null, 0);
    }
    
    public function exec($sql) {
        $result = $this->tursoRequest($sql);
        if ($result) {
            $this->lastInsertId = $result['lastInsertRowid'] ?? null;
            return $result['rowsAffected'] ?? 0;
        }
        return 0;
    }
    
    public function lastInsertId() {
        return $this->lastInsertId;
    }
    
    public function beginTransaction() {
        // Turso supports batch operations for transactions
        return true;
    }
    
    public function commit() {
        return true;
    }
    
    public function rollBack() {
        return true;
    }
    
    public function prepareAndExecute($sql, $params = []) {
        return $this->tursoRequest($sql, $params);
    }
}

class TursoStatement {
    private $db;
    private $sql;
    private $result;
    
    public function __construct($db, $sql) {
        $this->db = $db;
        $this->sql = $sql;
    }
    
    public function execute($params = []) {
        $result = $this->db->prepareAndExecute($this->sql, $params);
        $this->result = $result;
        return true;
    }
    
    public function fetchAll($fetchStyle = null) {
        if (!$this->result || !isset($this->result['rows'])) {
            return [];
        }
        return $this->result['rows'];
    }
    
    public function fetch($fetchStyle = null) {
        if (!$this->result || !isset($this->result['rows']) || empty($this->result['rows'])) {
            return false;
        }
        return $this->result['rows'][0];
    }
    
    public function fetchColumn() {
        if (!$this->result || !isset($this->result['rows']) || empty($this->result['rows'])) {
            return false;
        }
        $row = $this->result['rows'][0];
        return reset($row);
    }
    
    public function rowCount() {
        if (!$this->result) {
            return 0;
        }
        return $this->result['rowsAffected'] ?? 0;
    }
}

class TursoResult {
    private $rows;
    private $lastInsertId;
    private $rowsAffected;
    
    public function __construct($rows, $lastInsertId, $rowsAffected) {
        $this->rows = $rows ?? [];
        $this->lastInsertId = $lastInsertId;
        $this->rowsAffected = $rowsAffected;
    }
    
    public function fetchAll($fetchStyle = null) {
        return $this->rows;
    }
    
    public function fetch($fetchStyle = null) {
        if (!$this->rows || empty($this->rows)) {
            return false;
        }
        return $this->rows[0];
    }
    
    public function fetchColumn() {
        if (!$this->rows || empty($this->rows)) {
            return false;
        }
        $row = $this->rows[0];
        return reset($row);
    }
}