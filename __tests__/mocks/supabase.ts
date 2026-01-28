// Mock Supabase client
export const mockSupabaseFrom = jest.fn();
export const mockSupabaseSelect = jest.fn();
export const mockSupabaseInsert = jest.fn();
export const mockSupabaseUpdate = jest.fn();
export const mockSupabaseDelete = jest.fn();
export const mockSupabaseEq = jest.fn();
export const mockSupabaseNeq = jest.fn();
export const mockSupabaseSingle = jest.fn();
export const mockSupabaseOrder = jest.fn();
export const mockSupabaseRange = jest.fn();

const chainMethods = {
  select: mockSupabaseSelect,
  insert: mockSupabaseInsert,
  update: mockSupabaseUpdate,
  delete: mockSupabaseDelete,
  eq: mockSupabaseEq,
  neq: mockSupabaseNeq,
  single: mockSupabaseSingle,
  order: mockSupabaseOrder,
  range: mockSupabaseRange,
};

// Setup chaining
Object.values(chainMethods).forEach(mockFn => {
  mockFn.mockReturnValue(chainMethods);
});

mockSupabaseFrom.mockReturnValue(chainMethods);

export const mockSupabase = {
  from: mockSupabaseFrom,
};

export const resetSupabaseMocks = () => {
  mockSupabaseFrom.mockClear();
  mockSupabaseSelect.mockClear();
  mockSupabaseInsert.mockClear();
  mockSupabaseUpdate.mockClear();
  mockSupabaseDelete.mockClear();
  mockSupabaseEq.mockClear();
  mockSupabaseNeq.mockClear();
  mockSupabaseSingle.mockClear();
  mockSupabaseOrder.mockClear();
  mockSupabaseRange.mockClear();
  
  // Re-setup chaining
  Object.values(chainMethods).forEach(mockFn => {
    mockFn.mockReturnValue(chainMethods);
  });
  mockSupabaseFrom.mockReturnValue(chainMethods);
};
