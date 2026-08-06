alter table public.rooms
  add constraint rooms_portfolio_location_floor_valid
    check (
      room_number !~ '^[AB](0[1-9]|1[0-2])$'
      or (room_number ~ '^A0[1-6]$' and location = 'North Wing' and floor = 1)
      or (room_number ~ '^A(0[7-9]|1[0-2])$' and location = 'North Wing' and floor = 2)
      or (room_number ~ '^B0[1-6]$' and location = 'South Wing' and floor = 1)
      or (room_number ~ '^B(0[7-9]|1[0-2])$' and location = 'South Wing' and floor = 2)
    );
