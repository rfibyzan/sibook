-- Migration to make rack_code unique in locations table

-- First, we need to handle duplicates if they exist in the active database.
-- We keep the first occurrence (lowest ID) of each rack_code and delete others.
-- Before deleting, we reassign any books referencing duplicate locations to the one we keep.
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT rack_code, MIN(id::text)::uuid as keep_id 
        FROM locations 
        GROUP BY rack_code 
        HAVING COUNT(*) > 1
    LOOP
        -- Reassign books referencing the duplicate locations to the one we keep
        UPDATE books 
        SET location_id = r.keep_id 
        WHERE location_id IN (
            SELECT id FROM locations WHERE rack_code = r.rack_code AND id != r.keep_id
        );
        
        -- Delete the duplicates
        DELETE FROM locations 
        WHERE rack_code = r.rack_code AND id != r.keep_id;
    END LOOP;
END $$;

-- Now add the unique constraint to the rack_code column
ALTER TABLE locations ADD CONSTRAINT locations_rack_code_unique UNIQUE (rack_code);
