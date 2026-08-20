# Security

The Correspondence records controller remains ADMIN-only. Work Order and operation identifiers are UUID-validated at the HTTP boundary, and the service requires the immutable operation to belong to the supplied Work Order before materialization.
