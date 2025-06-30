#!/bin/bash

./dropbox_scanner --verbose --subset=tiles/bases --upload > ../openforge/db/fixtures/bases.json.next
./dropbox_scanner --verbose --subset=tiles/building_facades --upload > ../openforge/db/fixtures/building_facades.json.next
./dropbox_scanner --verbose --subset=tiles/catacombs --upload > ../openforge/db/fixtures/catacombs.json.next
./dropbox_scanner --verbose --subset=tiles/cave --upload > ../openforge/db/fixtures/cave.json.next
./dropbox_scanner --verbose --subset=tiles/cavern --upload > ../openforge/db/fixtures/cavern.json.next
./dropbox_scanner --verbose --subset=tiles/cracked_ice --upload > ../openforge/db/fixtures/cracked_ice.json.next
./dropbox_scanner --verbose --subset=tiles/cut-stone --upload > ../openforge/db/fixtures/cut-stone.json.next
./dropbox_scanner --verbose --subset=tiles/cut-stone+ruined --upload > ../openforge/db/fixtures/cut-stone_ruined.json.next
./dropbox_scanner --verbose --subset=tiles/dungeon_stone --upload > ../openforge/db/fixtures/dungeon_stone.json.next
./dropbox_scanner --verbose --subset=tiles/dungeon_stone+ruined --upload > ../openforge/db/fixtures/dungeon_stone_ruined.json.next
./dropbox_scanner --verbose --subset=tiles/dwarven_halls --upload > ../openforge/db/fixtures/dwarven_halls.json.next
./dropbox_scanner --verbose --subset=tiles/encounters --upload > ../openforge/db/fixtures/encounters.json.next
./dropbox_scanner --verbose --subset=tiles/legacy_sewers --upload > ../openforge/db/fixtures/legacy_sewers.json.next
./dropbox_scanner --verbose --subset=tiles/mines --upload > ../openforge/db/fixtures/mines.json.next
./dropbox_scanner --verbose --subset=tiles/pool --upload > ../openforge/db/fixtures/pool.json.next
./dropbox_scanner --verbose --subset=tiles/sewers --upload > ../openforge/db/fixtures/sewers.json.next
./dropbox_scanner --verbose --subset=tiles/towne --upload > ../openforge/db/fixtures/towne.json.next

pushd ../openforge/db/fixtures/
rename -f 's/\.json\.next/.json/' *.json.next
popd
