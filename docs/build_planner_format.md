Build Planner (PoE2 only) 
The Build Planner is a game-wide build instructor that integrates with mission-critical systems such as skills, crafting, passives, and ascendancy.
Designed for players to import builds from third-party sources, the Build Planner functions as a plug-and-play feature.
Editing or creating builds within Path Of Exile 2 is currently not supported.

Usage 
To activate the Build Planner, at least one valid *.build file should be present. (See guide below)
Once our automated File Watcher system successfully detects a valid build, all features of the Build Planner will be activated and visible.

Build Directory 
When attempting to load build files into Path Of Exile 2, the game expects a *.build file written in JSON format.
Our automated File Watcher system has been designed to detect changes in the Preferences/BuildPlanner directory. All *.build files should be added here.

Use the following platform-specific guide below to help locate the Preferences/BuildPlanner directory:

Windows
Default Location: C:/Users/Name/Documents/My Games/Path of Exile 2/BuildPlanner
SteamOS
Default Location: /home/deck/.local/share/Steam/steamapps/compatdata/2315204395/pfx/drive_c/users/steamuser/Documents/My Games/Path of Exile 2/BuildPlanner
Build File Format 

Version: 1 (Experimental)
Build files are comprised of a single JSON root object with the following members:
object Build 
Key	Type
name	string
author	?string
description	?string
ascendancy	?string
passives	?array of (string or BuildPassive)
skills	?array of (string or BuildSkill)
inventory_slots	?array of BuildInventorySlot
object BuildPassive 
Referenced by Build→passives.
Used to define passives for the build. Visible in the Passive Skill Tree.

Key	Type	Extra Information
id	string	a PassiveSkills table id. Example: strength89
level_interval	?(array of uint, or uint)	a level range. Example: [0, 100]
weapon_set	?uint	a weapon set index between 0 and 2 (inclusive)
additional_text	?string	text that is shown when the passive is hovered over in-game
object BuildSkill 
Referenced by Build→skills.
Used to define skills for the build. Accessible from an Uncut Skill Gem and/or Uncut Spirit Gem.

Meta gems are currently not supported.

Key	Type	Extra Information
id	string	a BaseItemTypes table id. Example: Metadata/Items/Gems/SkillGemEarthquake
level_interval	?(array of uint, or uint)	a level range. Example: [0, 100]
additional_text	?string	text that is shown when the skill is hovered over in a gem crafting window
support_skills	?array of (string or BuildSupport)	
object BuildSupport 
Referenced by BuildSkill→support_skills.
Used to define support skills for a given parent skill. Accessible from an Uncut Support Gem and/or Uncut Spirit Gem.

Key	Type	Extra Information
id	string	a BaseItemTypes table id. Example "Metadata/Items/Gems/SupportGemFastForward"
level_interval	?(array of uint, or uint)	a level range. Example: [0, 100]
additional_text	?string	text that is shown when the support is hovered over in a gem crafting window
object BuildInventorySlot 
Referenced by Build→inventory_slots.
Used to show hints on inventory slots for the build. Visible in the character inventory panel.

Key	Type	Extra Information
inventory_id	string	an Inventories table id. Example "Weapon1"
level_interval	?(array of uint, or uint)	a level range. Example: [0, 100]
unique_name	?string	a UniqueName entry from the Words table. Example "Kalandra's Touch"
additional_text	?string	text to show when the inventory slot build planner popup indicator is hovered
Markup Support 
Markup formatting is available when defining the additional_text field.

The available markup modification keywords, and there associated values, are as follows:

Font 
Key	Value	Example
Regular	r	<r>{ Example Text }
Bold	b	<b>{ Example Text }
Italics	i	<i>{ Example Text }
Underline	u	<u>{ Example Text }
Small	s	<s>{ Example Text }
Medium	m	<m>{ Example Text }
Large	l	<l>{ Example Text }
Colours 
Key	Example
Red	<red>{ Example Text }
Orange	<orange>{ Example Text }
Yellow	<yellow>{ Example Text }
Green	<green>{ Example Text }
Blue	<blue>{ Example Text }
Indigo	<indigo>{ Example Text }
Violet	<violet>{ Example Text }
Black	<black>{ Example Text }
White	<white>{ Example Text }
Grey	<grey>{ Example Text }
Bronze	<bronze>{ Example Text }
Silver	<silver>{ Example Text }
Gold	<gold>{ Example Text }
Custom	<rgb(255, 255, 255)>{ Example Text }
