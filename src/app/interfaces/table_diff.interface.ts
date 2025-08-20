// Interface representing the difference between two database tables
export interface ITableDiff {
	table_differences: {
		[tableName: string]: {
			fields_exist_in_db1_and_db2_but_difference: {
				[fieldName: string]: {
					data_type_in_db1: string;
					data_type_in_db2: string;
				};
			};
			fields_exist_in_db1_only: {
				[fieldName: string]: string;
			};
			fields_exist_in_db2_only: {
				[fieldName: string]: string;
			};
		};
	};
	tables_only_in_db1: string[];
	tables_only_in_db2: string[];
}
