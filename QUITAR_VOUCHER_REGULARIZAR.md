# Cambios a realizar en RegularizarDepositos.jsx

## 1. Eliminar estados relacionados con archivos (líneas 60-65):
```javascript
const [selectedFile, setSelectedFile] = useState(null);
const [filePreview, setFilePreview] = useState(null);
const [isUploadingToGoogleDrive, setIsUploadingToGoogleDrive] = useState(false);
const [googleDriveUrl, setGoogleDriveUrl] = useState('');
const [isDragging, setIsDragging] = useState(false);
```

## 2. Eliminar initializeGoogleDrive del useEffect (línea 75)

## 3. Eliminar función initializeGoogleDrive (líneas 116-122)

## 4. Eliminar funciones handleFileChange, processFile, handleDragOver, handleDragLeave, handleDrop, handleUploadToGoogleDrive (líneas 219-282)

## 5. Eliminar validación de googleDriveUrl en validateForm (línea 263)

## 6. Eliminar imagen_voucher del depositData (línea 297)

## 7. Eliminar limpieza de estados de archivo en resetForm (líneas 368-370)

## 8. Eliminar toda la sección de Voucher del JSX (Columna 3, líneas 608-664)

## 9. Eliminar imports no utilizados (líneas 5, 18-19, 25)
