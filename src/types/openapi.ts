/**
 * Enhanced TypeScript types for OpenAPI specifications and operations
 * Replaces generic 'any' types with specific, type-safe interfaces
 */

/**
 * OpenAPI 3.0+ specification structure
 */
export interface OpenAPISpec {
  openapi?: string;
  swagger?: string;
  info: OpenAPIInfo;
  servers?: OpenAPIServer[];
  paths: OpenAPIPaths;
  components?: OpenAPIComponents;
  security?: OpenAPISecurityRequirement[];
  tags?: OpenAPITag[];
  externalDocs?: OpenAPIExternalDocumentation;
}

export interface OpenAPIInfo {
  title: string;
  description?: string;
  termsOfService?: string;
  contact?: OpenAPIContact;
  license?: OpenAPILicense;
  version: string;
}

export interface OpenAPIContact {
  name?: string;
  url?: string;
  email?: string;
}

export interface OpenAPILicense {
  name: string;
  url?: string;
}

export interface OpenAPIServer {
  url: string;
  description?: string;
  variables?: Record<string, OpenAPIServerVariable>;
}

export interface OpenAPIServerVariable {
  enum?: string[];
  default: string;
  description?: string;
}

export interface OpenAPIPaths {
  [path: string]: OpenAPIPathItem;
}

export interface OpenAPIPathItem {
  $ref?: string;
  summary?: string;
  description?: string;
  get?: OpenAPIOperation;
  put?: OpenAPIOperation;
  post?: OpenAPIOperation;
  delete?: OpenAPIOperation;
  options?: OpenAPIOperation;
  head?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  trace?: OpenAPIOperation;
  servers?: OpenAPIServer[];
  parameters?: (OpenAPIParameter | OpenAPIReference)[];
}

export interface OpenAPIOperation {
  tags?: string[];
  summary?: string;
  description?: string;
  externalDocs?: OpenAPIExternalDocumentation;
  operationId?: string;
  parameters?: (OpenAPIParameter | OpenAPIReference)[];
  requestBody?: OpenAPIRequestBody | OpenAPIReference;
  responses: OpenAPIResponses;
  callbacks?: Record<string, OpenAPICallback | OpenAPIReference>;
  deprecated?: boolean;
  security?: OpenAPISecurityRequirement[];
  servers?: OpenAPIServer[];
}

export interface OpenAPIParameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: OpenAPISchema | OpenAPIReference;
  example?: any;
  examples?: Record<string, OpenAPIExample | OpenAPIReference>;
  content?: Record<string, OpenAPIMediaType>;
}

export interface OpenAPIRequestBody {
  description?: string;
  content: Record<string, OpenAPIMediaType>;
  required?: boolean;
}

export interface OpenAPIMediaType {
  schema?: OpenAPISchema | OpenAPIReference;
  example?: any;
  examples?: Record<string, OpenAPIExample | OpenAPIReference>;
  encoding?: Record<string, OpenAPIEncoding>;
}

export interface OpenAPIEncoding {
  contentType?: string;
  headers?: Record<string, OpenAPIHeader | OpenAPIReference>;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
}

export interface OpenAPIResponses {
  [statusCode: string]: OpenAPIResponse | OpenAPIReference;
  default?: OpenAPIResponse | OpenAPIReference;
}

export interface OpenAPIResponse {
  description: string;
  headers?: Record<string, OpenAPIHeader | OpenAPIReference>;
  content?: Record<string, OpenAPIMediaType>;
  links?: Record<string, OpenAPILink | OpenAPIReference>;
}

export interface OpenAPIHeader {
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: OpenAPISchema | OpenAPIReference;
  example?: any;
  examples?: Record<string, OpenAPIExample | OpenAPIReference>;
  content?: Record<string, OpenAPIMediaType>;
}

export interface OpenAPIExample {
  summary?: string;
  description?: string;
  value?: any;
  externalValue?: string;
}

export interface OpenAPILink {
  operationRef?: string;
  operationId?: string;
  parameters?: Record<string, any>;
  requestBody?: any;
  description?: string;
  server?: OpenAPIServer;
}

export interface OpenAPICallback {
  [expression: string]: OpenAPIPathItem;
}

export interface OpenAPIComponents {
  schemas?: Record<string, OpenAPISchema | OpenAPIReference>;
  responses?: Record<string, OpenAPIResponse | OpenAPIReference>;
  parameters?: Record<string, OpenAPIParameter | OpenAPIReference>;
  examples?: Record<string, OpenAPIExample | OpenAPIReference>;
  requestBodies?: Record<string, OpenAPIRequestBody | OpenAPIReference>;
  headers?: Record<string, OpenAPIHeader | OpenAPIReference>;
  securitySchemes?: Record<string, OpenAPISecurityScheme | OpenAPIReference>;
  links?: Record<string, OpenAPILink | OpenAPIReference>;
  callbacks?: Record<string, OpenAPICallback | OpenAPIReference>;
}

export interface OpenAPISchema {
  // Core schema properties
  type?:
    | "null"
    | "boolean"
    | "object"
    | "array"
    | "number"
    | "string"
    | "integer";
  format?: string;
  title?: string;
  description?: string;
  default?: any;
  example?: any;
  examples?: any[];

  // Validation properties
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: boolean | number;
  minimum?: number;
  exclusiveMinimum?: boolean | number;
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  maxProperties?: number;
  minProperties?: number;
  required?: string[];
  enum?: any[];

  // Object properties
  properties?: Record<string, OpenAPISchema | OpenAPIReference>;
  additionalProperties?: boolean | OpenAPISchema | OpenAPIReference;
  patternProperties?: Record<string, OpenAPISchema | OpenAPIReference>;

  // Array properties
  items?:
    | OpenAPISchema
    | OpenAPIReference
    | (OpenAPISchema | OpenAPIReference)[];

  // Composition
  allOf?: (OpenAPISchema | OpenAPIReference)[];
  oneOf?: (OpenAPISchema | OpenAPIReference)[];
  anyOf?: (OpenAPISchema | OpenAPIReference)[];
  not?: OpenAPISchema | OpenAPIReference;

  // OpenAPI specific
  discriminator?: OpenAPIDiscriminator;
  readOnly?: boolean;
  writeOnly?: boolean;
  xml?: OpenAPIXML;
  externalDocs?: OpenAPIExternalDocumentation;
  deprecated?: boolean;
  nullable?: boolean;
}

export interface OpenAPIReference {
  $ref: string;
}

export interface OpenAPIDiscriminator {
  propertyName: string;
  mapping?: Record<string, string>;
}

export interface OpenAPIXML {
  name?: string;
  namespace?: string;
  prefix?: string;
  attribute?: boolean;
  wrapped?: boolean;
}

export interface OpenAPISecurityScheme {
  type: "apiKey" | "http" | "oauth2" | "openIdConnect";
  description?: string;
  name?: string;
  in?: "query" | "header" | "cookie";
  scheme?: string;
  bearerFormat?: string;
  flows?: OpenAPIOAuthFlows;
  openIdConnectUrl?: string;
}

export interface OpenAPIOAuthFlows {
  implicit?: OpenAPIOAuthFlow;
  password?: OpenAPIOAuthFlow;
  clientCredentials?: OpenAPIOAuthFlow;
  authorizationCode?: OpenAPIOAuthFlow;
}

export interface OpenAPIOAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes: Record<string, string>;
}

export interface OpenAPISecurityRequirement {
  [name: string]: string[];
}

export interface OpenAPITag {
  name: string;
  description?: string;
  externalDocs?: OpenAPIExternalDocumentation;
}

export interface OpenAPIExternalDocumentation {
  description?: string;
  url: string;
}

/**
 * Enhanced endpoint information with strong typing
 */
export interface TypedEndpointInfo {
  method:
    | "GET"
    | "POST"
    | "PUT"
    | "DELETE"
    | "PATCH"
    | "OPTIONS"
    | "HEAD"
    | "TRACE";
  path: string;
  summary?: string;
  description?: string;
  operationId?: string;
  tags: string[];
  deprecated: boolean;
  parameters: TypedParameter[];
  requestBody?: TypedRequestBody;
  responses: TypedResponse[];
  security?: OpenAPISecurityRequirement[];
}

export interface TypedParameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required: boolean;
  deprecated: boolean;
  schema: TypedSchema;
  example?: any;
}

export interface TypedRequestBody {
  description?: string;
  required: boolean;
  contentTypes: string[];
  schema?: TypedSchema;
  examples?: Record<string, any>;
}

export interface TypedResponse {
  statusCode: string;
  description: string;
  contentTypes: string[];
  schema?: TypedSchema;
  headers?: Record<string, TypedHeader>;
  examples?: Record<string, any>;
}

export interface TypedHeader {
  description?: string;
  required: boolean;
  schema: TypedSchema;
}

export interface TypedSchema {
  type:
    | "null"
    | "boolean"
    | "object"
    | "array"
    | "number"
    | "string"
    | "integer"
    | "unknown";
  format?: string;
  description?: string;
  required?: string[];
  properties?: Record<string, TypedSchema>;
  items?: TypedSchema;
  enum?: any[];
  example?: any;
  nullable: boolean;
}

/**
 * Tool argument types for better type safety
 */
export interface ToolArguments {
  [key: string]: string | number | boolean | undefined;
}

export interface ProviderToolArgs extends ToolArguments {
  provider?: string;
}

export interface APIToolArgs extends ToolArguments {
  provider: string;
  service?: string;
  api: string;
}

export interface EndpointToolArgs extends ToolArguments {
  api_id: string;
  method?: string;
  path?: string;
}

export interface SearchToolArgs extends ToolArguments {
  query: string;
  limit?: number;
  page?: number;
}

export interface PaginationToolArgs extends ToolArguments {
  page?: number;
  limit?: number;
}

/**
 * Context types for tool execution
 */
export interface ToolExecutionContext {
  apiClient: any; // Will be replaced with proper client interface
  cacheManager: any; // Will be replaced with proper cache interface
  requestId?: string;
  userId?: string;
}

/**
 * Result types for API operations
 */
export interface APIOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    source: "primary" | "secondary" | "custom" | "triple";
    cached: boolean;
    timestamp: string;
    executionTime?: number;
  };
}

export interface PaginatedResult<T = any> {
  results: T[];
  pagination: {
    page: number;
    limit: number;
    total_results: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  metadata?: {
    source: "primary" | "secondary" | "custom" | "triple";
    cached: boolean;
    timestamp: string;
  };
}

/**
 * Type guards for runtime type checking
 */
export function isOpenAPISpec(obj: any): obj is OpenAPISpec {
  return (
    obj &&
    typeof obj === "object" &&
    (obj.openapi || obj.swagger) &&
    obj.info &&
    typeof obj.info === "object" &&
    typeof obj.info.title === "string"
  );
}

export function isOpenAPIOperation(obj: any): obj is OpenAPIOperation {
  return (
    obj &&
    typeof obj === "object" &&
    obj.responses &&
    typeof obj.responses === "object"
  );
}

export function isOpenAPISchema(obj: any): obj is OpenAPISchema {
  return obj && typeof obj === "object";
}

export function isOpenAPIReference(obj: any): obj is OpenAPIReference {
  return obj && typeof obj === "object" && typeof obj.$ref === "string";
}

/**
 * Utility types for complex operations
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Error types for OpenAPI operations
 */
export interface OpenAPIValidationError {
  path: string;
  message: string;
  value?: any;
  schema?: TypedSchema;
}

export interface EndpointError {
  endpoint: string;
  method: string;
  error: string;
  statusCode?: number;
  details?: Record<string, any>;
}
