-- Consulta para ver archivos en drive_files que NO están vinculados a ningún depósito
-- (deposito_id es NULL)

SELECT 
    id,
    file_url,
    deposito_id
FROM public.drive_files 
WHERE deposito_id IS NULL
ORDER BY id DESC;

-- También podemos ver el total de archivos no vinculados
SELECT 
    COUNT(*) as total_archivos_sin_vincular
FROM public.drive_files 
WHERE deposito_id IS NULL;

-- Y para ver todos los archivos (vinculados y no vinculados)
SELECT 
    id,
    file_url,
    deposito_id,
    CASE 
        WHEN deposito_id IS NULL THEN 'NO VINCULADO'
        ELSE 'VINCULADO'
    END as estado_vinculacion
FROM public.drive_files 
ORDER BY id DESC;