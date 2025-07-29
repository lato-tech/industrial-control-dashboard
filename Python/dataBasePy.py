import json
import sqlite3
from datetime import datetime


class BatchDatabase:
    def __init__(self, db_name="panel_data.db"):
        self.dbName = db_name
        self.startConn()
        self.createTables()
        self.my_list = ["6kV1", "8kV1", "", "6kV2", "8kV2", "", "6kV3", "12kV1", "", "6kV4", "12kV2", ""]
        self.stateList = ["Off" for _ in range(12)]
        # self._create_tables()
        self.AllCCycles = [None for _ in range(12)]
        self.user = "--"
        self.updateD = 30
        self.panel_to_index = {1: 0, 4: 1, 7: 2, 10: 3, 8: 4, 11: 5, 3: 6, 6: 7} #6k-x4, 12k-x2, ov, bl
        print("Closed")
        self.close()

    def fetch_batch_from_db(self, cursor, table_id, batch_id=None, batch_name=None):

        try:
            if batch_id is not None:
                cursor.execute('''
                    SELECT table_id, batch_id, batch_name, start_time, total_time, data, current_cycle, cEvent, end_time
                    FROM batches
                    WHERE table_id = ? AND batch_id = ?
                ''', (table_id, batch_id))
            elif batch_name is not None:
                cursor.execute('''
                    SELECT table_id, batch_id, batch_name, start_time, total_time, data, current_cycle, cEvent, end_time
                    FROM batches
                    WHERE table_id = ? AND batch_name = ?
                ''', (table_id, batch_name))
            else:
                return None

            # Fetch the result
            row = cursor.fetchone()

            if row:
                # Convert the result to a dictionary
                result = {
                    'table_id': row[0],
                    'batch_id': row[1],
                    'batch_name': row[2],
                    'start_time': row[3],
                    'total_time': row[4],
                    'data': json.loads(row[5]) if row[5] else None,
                    'current_cycle': row[6],
                    'cEvent': row[7],
                    'end_time': row[8]
                }
                return result
            else:
                return None
        except Exception as e:
            print(e)
            return None




    def getBatchName(self, table_id, cursor):
        current_date = datetime.now()
        year_yy = str(current_date.year)[-2:]  # Last two digits of the year
        month_mm = str(current_date.month).zfill(2)  # Zero-padded month
        batches, count = self.getBatchesInDateRange(cursor, table_id)
        bNum = str(count+1).zfill(3)
        batch_n = f"{self.my_list[table_id - 1]}{year_yy}{month_mm}{bNum}"
        return batch_n


    def createNewBatch(self, cursor, table_id, batchID):
        start_time = datetime.now().isoformat()
        initial_table_data = [["--",  "--",  "--",  "--", "--"] for _ in range(28)]
        if table_id in [8,11]:
            initial_table_data = [["--", "--", "--", "--", "--", "--", "--"] for _ in range(28)]
        # initial_table_data[0][0] = start_time
        cursor.execute('''
                            INSERT INTO batches (table_id, batch_id, batch_name, start_time, total_time, data, current_cycle, cEvent, end_time)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ''', (table_id, batchID, self.getBatchName(table_id, cursor), start_time, "-", json.dumps(initial_table_data), 0, 0, None))

    def update_batch_data(self, cursor, batch_id, table_id, data, cCycle, cEvent, endTime):
        """
        Updates the 'data' column in the 'batches' table for a specific batch_id and table_id.

        Parameters:
            cursor: SQLite cursor object to execute the SQL command.
            batch_id: ID of the batch to update.
            table_id: ID of the table to update.
            data: The new data to update, in dictionary or JSON format.
        """
        # Serialize the data to JSON format
        serialized_data = json.dumps(data)

        # Execute the update query
        cursor.execute('''
            UPDATE batches
            SET
                data = ?, 
                current_cycle = ?, 
                cEvent = ?,
                end_time = ?
            WHERE 
                batch_id = ? AND table_id = ?
        ''', (serialized_data, cCycle, cEvent, endTime, batch_id, table_id))

    def getBatchesInDateRange(self, cursor, table_id, start_date = datetime.now().strftime("%Y-%m-01"), end_date = datetime.now().strftime("%Y-%m-%d")):
        print(datetime.now().strftime("%Y-%m-01"))
        print(start_date)
        cursor.execute('''
            SELECT batch_name, start_time
            FROM batches 
            WHERE table_id = ? 
            AND DATE(start_time) BETWEEN ? AND ?
        ''', (table_id, start_date, end_date))
        results = cursor.fetchall()
        num_rows = len(results)
        return results, num_rows

    def get_current_cycles(self, cursor):
        current_cycles = []

        for table_id in range(1, 13):  # Loop through table IDs 1-12
            cursor.execute('''
                SELECT current_cycle 
                FROM batches
                WHERE table_id = ?
                ORDER BY batch_id DESC
                LIMIT 1
            ''', (table_id,))
            result = cursor.fetchone()
            print(result)
            # Append cycle value or None if no batch exists for the table_id
            current_cycles.append(result[0] if result else None)
            self.AllCCycles = current_cycles
        return current_cycles

    def get_latest_batch(self, table_id):
        self.startConn()
        cursor = self.cursor
        cursor.execute('''
            SELECT batch_id, batch_name, start_time, total_time, data, current_cycle, cEvent, end_time
            FROM batches
            WHERE table_id = ?
            ORDER BY batch_id DESC
            LIMIT 1
        ''', (table_id,))
        latest_batch = cursor.fetchone()

        if not latest_batch or (latest_batch[5] == 143 and latest_batch[6] == 143):
            # Create a new batch if none exists

            batchID = 1
            if latest_batch:
                batchID = latest_batch[0]+1
            self.createNewBatch(cursor, table_id, batchID)
            # Fetch the newly created batch
            cursor.execute('''
                SELECT batch_id, batch_name, start_time, total_time, data, current_cycle, cEvent, end_time
                FROM batches
                WHERE table_id = ?
                ORDER BY batch_id DESC
                LIMIT 1
            ''', (table_id,))
            latest_batch = cursor.fetchone()
        self.close()
        # Return the batch data
        print(latest_batch[2])
        batch_data = {
            "batch_id": latest_batch[0],
            "batch_name": latest_batch[1],
            "start_time": latest_batch[2],
            "total_time": latest_batch[3],
            "data": json.loads(latest_batch[4]) if latest_batch[4] else [],
            "current_cycle": latest_batch[5],
            "cEvent": latest_batch[6],
            "end_time": latest_batch[7],
        }
        return batch_data


    def startConn(self):
        self.conn = sqlite3.connect(self.dbName, check_same_thread=False)
        self.cursor = self.conn.cursor()

    def set_list(self,cursor, values):
        # self.startConn()
        # cursor = self.cursor
        cursor.execute("DELETE FROM ListTable")
        cursor.executemany("INSERT INTO ListTable (value) VALUES (?)", [(v,) for v in values])
        # self.close()

    def get_list(self):
        self.startConn()
        cursor = self.cursor
        cursor.execute("SELECT value FROM ListTable")
        values = [row[0] for row in cursor.fetchall()]
        self.close()

        return values


    def set_dict_variable(self,cursor ,key , value):
        # Connect to the database
        # self.startConn()
        # cursor = self.cursor

        # Insert or update the key-value pair
        cursor.execute("""
            INSERT INTO DictTable (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        """, (key, json.dumps(value)))
        # self.close()

    def get_dict(self):
        # Connect to the database
        self.startConn()
        cursor = self.cursor
        cursor.execute("SELECT key, value FROM DictTable")
        dictionary = {row[0]: json.loads(row[1]) for row in cursor.fetchall()}
        self.close()
        return dictionary

    def get_dict_value(self, key):
        # Connect to the database
        self.startConn()
        cursor = self.cursor
        cursor.execute("SELECT value FROM DictTable WHERE key = ?", (key,))
        row = cursor.fetchone()
        self.close()
        return json.loads(row[0]) if row else None

    def createTables(self):

        self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS ListTable (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    value REAL
                )
            """)

        tSvL = [0 for _ in range(1, 9)]
        cursor = self.cursor
        cursor.execute("SELECT COUNT(*) FROM ListTable")
        if cursor.fetchone()[0] == 0:
            self.set_list(cursor, tSvL)



        self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS Users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT NOT NULL UNIQUE,
                    password TEXT NOT NULL
                );
            """)

        self.cursor.execute('''CREATE TABLE IF NOT EXISTS batches (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_id INTEGER,
                batch_id INTEGER,
                batch_name TEXT,
                start_time TEXT,
                total_time TEXT,
                data TEXT,
                current_cycle INTEGER,
                cEvent INTEGER,
                end_time TEXT
                )''')

        self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS update_data (
                    update_id INTEGER PRIMARY KEY AUTOINCREMENT,  -- Unique row identifier
                    timestamp DATETIME DEFAULT (datetime('now', 'localtime'))   -- Automatically add timestamp
                );
            """)

        self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS panel_data (
                    panel_id INTEGER,    -- Panel identifier (1 to 12)
                    update_id INTEGER,   -- Reference to the update (foreign key to update_data)
                    panel_name TEXT,     -- Panel-specific data
                    cycle TEXT,
                    fSv REAL,
                    fPv REAL,
                    temperature REAL,
                    user TEXT,
                    state TEXT,
                    FOREIGN KEY (update_id) REFERENCES update_data (update_id) 
                );
                """)

        # Create a table to store the dictionary
        self.cursor.execute("""
                CREATE TABLE IF NOT EXISTS DictTable (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    key TEXT UNIQUE,
                    value TEXT
                )
            """)
        cursor.execute("SELECT COUNT(*) FROM DictTable")
        if cursor.fetchone()[0] == 0:
            self.set_dict_variable(cursor, "updateD", 30)

    def close(self):
        self.conn.commit()
        self.conn.close()


# Example usage
if __name__ == "__main__":
    pass
