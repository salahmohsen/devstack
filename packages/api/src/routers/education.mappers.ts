import { type EducationOutput } from "@tsu-stack/core";
import { type EducationSchemaSelect } from "@tsu-stack/db/types";

export function toEducationOutput(row: EducationSchemaSelect): EducationOutput {
  return {
    id: row.id,
    school: row.school,
    degree: row.degree,
    field: row.field,
    location: row.location,
    fromDate: row.fromDate,
    toDate: row.toDate,
    isPresent: row.isPresent ?? false,
    description: row.description,
    gpa: row.gpa,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
