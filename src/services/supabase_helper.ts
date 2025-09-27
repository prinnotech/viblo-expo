import { supabase } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

// Define a generic result type to handle Supabase responses consistently.
// It provides strongly-typed data and a potential PostgrestError.
type DbResult<T> = {
    data: T | null;
    error: PostgrestError | null;
};

// Define a more specific result type for queries that return an array.
type DbResultArray<T> = {
    data: T[] | null;
    error: PostgrestError | null;
};

/**
 * A generic function to fetch a single row from a table by its ID.
 * @param tableName - The name of the database table.
 * @param id - The unique identifier of the row to fetch.
 * @returns An object containing the typed data or an error.
 */
export async function getRowById<T>(tableName: string, id: string | number): Promise<DbResult<T>> {
    const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
    if (error) {
        console.error(`Error fetching row from ${tableName} with id ${id}:`, error.message);
    }
    return { data, error };
}

/**
 * A generic function to fetch multiple rows from a table, with an optional filter.
 * @param tableName - The name of the database table.
 * @param filter - An object specifying the column and value to filter by.
 * @returns An object containing an array of typed data or an error.
 */
export async function getRows<T>(
    tableName: string,
    filter?: { column: string; value: any }
): Promise<DbResultArray<T>> {
    let query = supabase.from(tableName).select('*');
    if (filter) {
        query = query.eq(filter.column, filter.value);
    }
    const { data, error } = await query;
    if (error) {
        console.error(`Error fetching rows from ${tableName}:`, error.message);
    }
    return { data, error };
}

/**
 * A generic function to insert a new row into a table.
 * @param tableName - The name of the database table.
 * @param rowData - The data for the new row.
 * @returns An object containing the newly created data (as a single item array) or an error.
 */
export async function insertRow<T>(tableName: string, rowData: Partial<T>): Promise<DbResultArray<T>> {
    const { data, error } = await supabase.from(tableName).insert(rowData).select();
    if (error) {
        console.error(`Error inserting row into ${tableName}:`, error.message);
    }
    return { data, error };
}

/**
 * A generic function to update an existing row in a table by its ID.
 * @param tableName - The name of the database table.
 * @param id - The unique identifier of the row to update.
 * @param updateData - An object with the fields to update.
 * @returns An object containing the updated data (as a single item array) or an error.
 */
export async function updateRow<T>(
    tableName: string,
    id: string | number,
    updateData: Partial<T>
): Promise<DbResultArray<T>> {
    const { data, error } = await supabase.from(tableName).update(updateData).eq('id', id).select();
    if (error) {
        console.error(`Error updating row in ${tableName} with id ${id}:`, error.message);
    }
    return { data, error };
}

/**
 * A generic function to delete a row from a table by its ID.
 * @param tableName - The name of the database table.
 * @param id - The unique identifier of the row to delete.
 * @returns An object containing only an error if one occurred.
 */
export async function deleteRow(tableName: string, id: string | number): Promise<{ error: PostgrestError | null }> {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) {
        console.error(`Error deleting row in ${tableName} with id ${id}:`, error.message);
    }
    return { error };
}
