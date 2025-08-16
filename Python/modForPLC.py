import struct
import time
from pymodbus.client.sync import ModbusSerialClient as ModbusClient
from pymodbus.exceptions import ModbusException
import math


class ModBusController:
    def __init__(self, port, slave_id, parityIN='N'):
        """
        Initialize the VFDController object.

        :param port: RS485 port for communication (e.g., '/dev/ttyS0').
        :param slave_id: Slave ID of the VFD.
        """
        self.port = port
        self.slave_id = slave_id
        self.baudrate = 9600
        self.timeout = 2
        self.client = ModbusClient(
            method='rtu',
            port=self.port,
            baudrate=self.baudrate,
            timeout=self.timeout,
            parity=parityIN,
            stopbits=1,
            bytesize=8
        )

    def connect(self):
        """Connect to the VFD."""
        if not self.client.connect():
            raise ConnectionError("Failed to connect to the VFD.")

    def close(self):
        """Close the Modbus client connection."""
        self.client.close()

    def read_register_in(self, register_address):
        """Read a holding register from the VFD."""
        result = None
        try:
            self.connect()
            result = self.client.read_input_registers(address=register_address, count=2, unit=self.slave_id)
            cTime = time.time()
            while result.isError() or result is None or (result is not None and len(result.registers)) <2 :
                time.sleep(.3)
                print("Recev: None or less")
                result = self.client.read_input_registers(address=register_address, count=2, unit=self.slave_id)
                if time.time() - cTime>5:
                    print("Time Out")
                    break
            if result.isError():
                raise ValueError(f"Error reading register {register_address}: {result}")
            registers = result.registers
            raw_value = struct.pack('>HH', registers[1], registers[0])  # '>HH' means Big-endian, 2 unsigned shorts
            float_value = struct.unpack('>f', raw_value)[0]
            return float_value
        except Exception as e:
            print("RR", result)
            print(f"Modbus error: {e}")

        finally:
            self.close()

    def getTemp(self, register_address):
        """Read a holding register from the VFD."""
        result = None
        register_address = 1560+register_address
        try:
            self.connect()
            result = self.client.read_input_registers(address=register_address, count=2, unit=self.slave_id)
            cTime = time.time()
            while result.isError() or result is None or len(result.registers) <2:
                time.sleep(.3)
                print("Recev: None or less")
                result = self.client.read_input_registers(address=register_address, count=2, unit=self.slave_id)
                if time.time() - cTime>5:
                    print("Time Out")
                    break
            if result.isError():
                raise ValueError(f"Error reading register {register_address}: {result}")
            register = result.registers[0]
            # print(result.registers[0])
            # raw_value = struct.pack('>HH', registers[1], registers[0])  # '>HH' means Big-endian, 2 unsigned shorts
            float_value = register/10 #struct.unpack('>f', raw_value)[0]
            return float_value
        except Exception as e:
            print("RR", result)
            print(f"Modbus error: {e}")

        finally:
            self.close()

    def read_register(self, register_address):
        """Read a holding register from the VFD."""
        try:
            self.connect()
            result = self.client.read_holding_registers(address=register_address, count=4, unit=self.slave_id)
            cTime = time.time()
            while result is None or result.isError():
                time.sleep(.3)
                print("Recev: None")
                result = self.client.read_holding_registers(address=register_address, count=2, unit=self.slave_id)
                if time.time() - cTime>5:
                    print("Time Out")

                    break
            if result.isError():
                raise ValueError(f"Error reading register {register_address}: {result}")
            return result.registers[0]
        except ModbusException as e:
            raise RuntimeError(f"Modbus error: {e}")
        finally:
            self.close()

    def write_register(self, register_address, value):
        """Write a value to a holding register on the VFD."""
        try:
            self.connect()
            result = self.client.write_register(address=register_address, value=value, unit=self.slave_id)
            cTime = time.time()
            while result.isError():
                print("error:")
                time.sleep(.3)
                result = self.client.write_register(address=register_address, value=value, unit=self.slave_id)
                if time.time() - cTime > 5:
                    break

            if result.isError():
                raise ValueError(f"Error writing to register {register_address}: {result}")
        except ModbusException as e:
            raise RuntimeError(f"Modbus error: {e}")
        finally:
            print("Write Sucess")
            self.close()

    def setFriq(self, friq):
        
        friq = round(int(friq), 2)
        if 10 < friq < 100:
            print("Friq Got:", friq)
            friq = int(100 * friq)          
        else:
            print("Error")
            return
        print("Set Friq Done")
        self.write_register(0x2001, friq)

    def getFriq(self):
        try:
            friq = self.read_register(0x2103) / 100
        except:
            return None
        if not friq is None:
            return friq
    def getSetFriq(self):
        try:
            friq = self.read_register(0x2102) / 100
        except:
            return None
        if not friq is None:
            return friq

    def _modify_register_bits(self, register_address, bit_mask, value):
        """
        Modify specific bits in a register without affecting others.

        :param register_address: Register to modify.
        :param bit_mask: Bit mask for the bits to modify.
        :param value: New value to set in the specified bits.
        """
        current_value = self.read_register(register_address)
        modified_value = (current_value & ~bit_mask) | (value & bit_mask)
        self.write_register(register_address, modified_value)

    def startMotor(self):
        """Set the appropriate bits in register 2000 to start the motor."""
        self._modify_register_bits(0x2000, 0b00000011, 0b10)  # Set bits 1-0 to 10B

    def stopMotor(self):
        """Set the appropriate bits in register 2000 to stop the motor."""
        self._modify_register_bits(0x2000, 0b00000011, 0b01)  # Set bits 1-0 to 01B

    def setFWD(self):
        """Set the forward direction in register 2000."""
        self._modify_register_bits(0x2000, 0b00110000, 0b00010000)  # Set bits 5-4 to 01B

    def setRev(self):
        """Set the reverse direction in register 2000."""
        self._modify_register_bits(0x2000, 0b00110000, 0b00100000)  # Set bits 5-4 to 10B

    def changeDir(self):
        """Change the direction of the motor in register 2000."""
        self._modify_register_bits(0x2000, 0b00110000, 0b00110000)  # Set bits 5-4 to 11B

    def setAccDec(self, value):
        """
        Set the acceleration/deceleration curve in register 2000.

        :param value: 1, 2, 3, or 4 (for 1st, 2nd, 3rd, or 4th accel/decel curve).
        """
        if value not in {1, 2, 3, 4}:
            raise ValueError("Value must be 1, 2, 3, or 4.")
        self._modify_register_bits(0x2000, 0b11000000, (value - 1) << 6)  # Set bits 7-6

    def setSpeed(self, value):
        """
        Set the step speed frequency in register 2000.

        :param value: 0-15 (corresponding to 0th to 15th step speed frequency).
        """
        if not (0 <= value <= 15):
            raise ValueError("Value must be between 0 and 15.")
        self._modify_register_bits(0x2000, 0b0000111100000000, value << 8)  # Set bits 11-8


# Example usage
if __name__ == "__main__":
    MFM = ModBusController(port="/dev/ttySC2", slave_id=11)
    RTD = ModBusController(port="/dev/ttySC3", slave_id=1, parityIN='E')
    # try:
    vfdS = [ModBusController("/dev/ttySC2", i) for i in range(1, 11)]
    vfdS[5].stopMotor()

    # print(MFM.read_register(0x46), end="|")
    #
    # print(MFM.read_register(30056), end="|")
    #
    # print(MFM.read_register(30056), end="|")
    #
    # print(MFM.read_register(30056), end="|")
    # for vfd in vfdS:
    #     print(vfd.getSetFriq())
    #     time.sleep(1)
    #     print(vfd.setFriq(47.2))
    #     time.sleep(1)
    #     print(vfd.getSetFriq())
    # print(RTD.write_register(83, 8), end="|")
    # print(RTD.write_register(84, 8), end="|")
    # print(RTD.write_register(85, 8), end="|")
    # print(RTD.write_register(86, 8), end="|")
    # print(RTD.write_register(87, 8), end="|")
    # print(RTD.write_register(88, 8), end="|")
    # print(RTD.write_register(89, 8), end="|")
    # print(RTD.write_register(90, 8), end="|")
    # time.sleep(1)
    # print(RTD.read_register(83), end="|")
    # print(RTD.read_register(84), end="|")
    # print(RTD.read_register(85), end="|")
    # print(RTD.read_register(86), end="|")
    # print(RTD.read_register(87), end="|")
    # print(RTD.read_register(88), end="|")
    # print(RTD.read_register(89), end="|")
    # print(RTD.read_register(90), end="|||||")



    # RTD.read_register_in2(1561)
    # RTD.read_register_in2(1562)
    # RTD.read_register_in2(1563)
    # RTD.read_register_in2(1564)
    # RTD.read_register_in2(1565)
    # RTD.read_register_in2(1566)
    # RTD.read_register_in2(1567)
    # RTD.read_register_in2(1568)

    # for i in range(0, 60):
    #     print(MFM.read_register_in(i*2), end="|")
    #     print(hex(i*2))
    #     time.sleep(.5)
    # print()
    # print("aa")
    # time.sleep(1)
    # # vfd.setFriq(47.1)
    # # vfd.setFWD()
    # time.sleep(1)
    # # print(vfd.getSetFriq())
    # # vfd.setSpeed(3)
    # time.sleep(1)
    # # vfd.setAccDec(2)
    # time.sleep(1)
        # vfd.stopMotor()
    # except Exception as e:
    #     print(f"Error: {e}")
