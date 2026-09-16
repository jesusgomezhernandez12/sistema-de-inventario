<?php
class Database {
    private static $instance = null;
    private $url;
    private $token;
    private $lastInsertId = null;
    
    private function __construct() {
        $this->url = $_ENV['TURSO_DATABASE_URL'] ?? getenv('TURSO_DATABASE_URL') ?: '';
        $this->token = $_ENV['TURSO_AUTH_TOKEN'] ?? getenv('TURSO_AUTH_TOKEN') ?: '';
        
        if (empty($this->url) || empty($this->token)) {
            throw new Exception('TURSO_DATABASE_URL y TURSO_AUTH_TOKEN requeridos en .env');
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
        $tursoArgs = [];
        foreach ($args as $arg) {
            if (is_null($arg)) {
                $tursoArgs[] = ['type' => 'null'];
            } elseif (is_int($arg)) {
                $tursoArgs[] = ['type' => 'integer', 'value' => $arg];
            } elseif (is_float($arg)) {
                $tursoArgs[] = ['type' => 'real', 'value' => $arg];
            } elseif (is_bool($arg)) {
                $tursoArgs[] = ['type' => 'integer', 'value' => $arg ? 1 : 0];
            } else {
                $tursoArgs[] = ['type' => 'text', 'value' => (string)$arg];
            }
        }
        
        $payload = [
            'requests' => [
                [
                    'type' => 'execute',
                    'stmt' => [
                        'sql' => $sql,
                        'args' => $tursoArgs
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
        
        $result = $data['results'][0] ?? null;
        if (!is_array($result)) {
            return null;
        }
        
        if (isset($result['error'])) {
            throw new Exception('Turso error: ' . $result['error']);
        }
        
        // Navigate: results[0].response.result → cols/rows/affected_row_count
        $resp = $result;
        if (isset($result['type']) && $result['type'] === 'ok' && isset($result['response'])) {
            $resp = $result['response'];
            if (isset($resp['result']) && is_array($resp['result'])) {
                $resp = $resp['result'];
            }
        }
        
        // Response can be either an array (with cols/rows) or a string (for some types)
        if (is_array($resp)) {
            $result = [
                'cols' => $resp['cols'] ?? [],
                'rows' => $resp['rows'] ?? [],
                'rowsAffected' => $resp['affected_row_count'] ?? 0,
                'lastInsertRowid' => $resp['last_insert_rowid'] ?? null
            ];
        }
        
        // Convert rows from Turso's typed format to plain PHP values
        if (isset($result['rows'])) {
            $result['rows'] = $this->decodeRows($result['rows'], $result['cols']);
        }
        
        return $result;
    }
    
    private function decodeRows($rows, $cols) {
        if (empty($rows)) return [];
        
        $decoded = [];
        $colNames = [];
        foreach (($cols ?? []) as $col) {
            $colNames[] = $col['name'] ?? null;
        }
        
        foreach ($rows as $rowIndex => $row) {
            $decodedRow = [];
            foreach ($row as $colIndex => $val) {
                if (is_array($val) && isset($val['type'])) {
                    $decodedValue = match($val['type']) {
                        'integer' => (int)($val['value'] ?? 0),
                        'real' => (float)($val['value'] ?? 0.0),
                        'text' => (string)($val['value'] ?? ''),
                        'null' => null,
                        default => $val['value'] ?? null
                    };
                } else {
                    $decodedValue = $val;
                }
                
                $key = $colNames[$colIndex] ?? $colIndex;
                $decodedRow[$key] = $decodedValue;
            }
            $decoded[] = $decodedRow;
        }
        
        return $decoded;
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
    
    public function setLastInsertId($id) {
        $this->lastInsertId = $id;
    }
    
    public function beginTransaction() {
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
    
    public function lastInsertRowid() {
        $stmt = $this->prepare("SELECT last_insert_rowid() as id");
        $stmt->execute();
        $row = $stmt->fetch();
        return $row ? ($row['id'] ?? null) : null;
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
        if ($result) {
            $this->db->setLastInsertId($result['lastInsertRowid'] ?? null);
        }
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
        return !empty($row) ? reset($row) : false;
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
        return !empty($row) ? reset($row) : false;
    }
    
    public function getLastInsertId() {
        return $this->lastInsertId;
    }
    
    public function getRowsAffected() {
        return $this->rowsAffected;
    }
}