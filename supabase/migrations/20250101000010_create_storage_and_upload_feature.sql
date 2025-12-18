-- 1. Create Storage Bucket for Documents
-- This script sets up the necessary storage space for document uploads.
INSERT INTO storage.buckets (id, name, public)
VALUES ('documentos', 'documentos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Create RLS Policies for Document Bucket
-- These policies secure the bucket, allowing public reads and authenticated uploads.

-- Allow public read access to all objects in the 'documentos' bucket
CREATE POLICY "Public Read Access for Documentos"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'documentos' );

-- Allow authenticated users to upload objects to the 'documentos' bucket
CREATE POLICY "Authenticated Upload for Documentos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'documentos' AND owner = auth.uid() );

-- Allow authenticated users to update their own objects
CREATE POLICY "Owner Update for Documentos"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'documentos' AND owner = auth.uid() );

-- Allow authenticated users to delete their own objects
CREATE POLICY "Owner Delete for Documentos"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'documentos' AND owner = auth.uid() );
