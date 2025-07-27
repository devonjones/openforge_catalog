#!/bin/bash

./dropbox_scanner --verbose --update=../openforge/db/fixtures/bases.json --upload > ../openforge/db/fixtures/bases.json.next
./dropbox_scanner --verbose --update=../openforge/db/fixtures/building_facades.json --upload > ../openforge/db/fixtures/building_facades.json.next
./dropbox_scanner --verbose --update=../openforge/db/fixtures/catacombs.json --upload > ../openforge/db/fixtures/catacombs.json.next
./dropbox_scanner --verbose --update=../openforge/db/fixtures/cave.json --upload > ../openforge/db/fixtures/cave.json.next
./dropbox_scanner --verbose --update=../openforge/db/fixtures/cavern.json --upload > ../openforge/db/fixtures/cavern.json.next
./dropbox_scanner --verbose --update=../openforge/db/fixtures/cracked_ice.json --upload > ../openforge/db/fixtures/cracked_ice.json.next
./dropbox_scanner --verbose --update=../openforge/db/fixtures/cut-stone.json --upload > ../openforge/db/fixtures/cut-stone.json.next
./dropbox_scanner --verbose --update=../openforge/db/fixtures/cut-stone_ruined.json --upload > ../openforge/db/fixtures/cut-stone_ruined.json.next
./dropbox_scanner --verbose --update=../openforge/db/fixtures/dungeon_stone.json --upload > ../openforge/db/fixtures/dungeon_stone.json.next
./dropbox_scanner --verbose --update=../openforge/db/fixtures/dungeon_stone_ruined.json --upload > ../openforge/db/fixtures/dungeon_stone_ruined.json.next
./dropbox_scanner --verbose --update=../openforge/db/fixtures/dwarven_halls.json --upload > ../openforge/db/fixtures/dwarven_halls.json.next
./dropbox_scanner --verbose --update=../openforge/db/fixtures/encounters.json --upload > ../openforge/db/fixtures/encounters.json.next
./dropbox_scanner --verbose --update=../openforge/db/fixtures/legacy_sewers.json --upload > ../openforge/db/fixtures/legacy_sewers.json.next
./dropbox_scanner --verbose --update=../openforge/db/fixtures/mines.json --upload > ../openforge/db/fixtures/mines.json.next
./dropbox_scanner --verbose --update=../openforge/db/fixtures/pool.json --upload > ../openforge/db/fixtures/pool.json.next
./dropbox_scanner --verbose --update=../openforge/db/fixtures/sewers.json --upload > ../openforge/db/fixtures/sewers.json.next
./dropbox_scanner --verbose --update=../openforge/db/fixtures/towne.json --upload > ../openforge/db/fixtures/towne.json.next

pushd ../openforge/db/fixtures/
  rename -f 's/\.json\.next/.json/' *.json.next
popd
