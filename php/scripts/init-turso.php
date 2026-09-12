<?php

require_once __DIR__ . '/../config/turso.php';

$schema = file_get_contents(__DIR__ . '/../schema.sql');
if ($schema === false) {
    throw new RuntimeException('No se pudo leer php/schema.sql');
}

function schemaStatements(string $schema): array
{
    $schema = preg_replace('/^\s*--.*$/m', '', $schema);
    $statements = [];
    $current = '';
    $triggerDepth = 0;

    foreach (preg_split('/(;\s*|\R)/', $schema, -1, PREG_SPLIT_DELIM_CAPTURE) as $part) {
        $current .= $part;
        $triggerDepth += substr_count(strtoupper($part), 'BEGIN');
        $triggerDepth -= substr_count(strtoupper($part), 'END');

        if (str_ends_with(trim($part), ';') && $triggerDepth <= 0) {
            $statement = trim($current, " \t\r\n;");
            if ($statement !== '') {
                $statements[] = $statement;
            }
            $current = '';
        }
    }

    $statement = trim($current, " \t\r\n;");
    if ($statement !== '') {
        $statements[] = $statement;
    }

    return $statements;
}

$statements = schemaStatements($schema);
foreach ($statements as $index => $statement) {
    tursoRequest([[
        'type' => 'execute',
        'stmt' => ['sql' => $statement, 'args' => []],
    ]]);
    printf("Sentencia %d/%d aplicada\n", $index + 1, count($statements));
}

echo "Esquema Turso inicializado correctamente\n";