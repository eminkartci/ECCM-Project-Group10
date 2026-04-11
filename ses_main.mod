######################################################
#
# Swiss-EnergyScope (SES) MILP formulation
# Model file
# Author: Stefano Moret
# Date: 01.04.2015
#
######################################################

### SETS ###

## MAIN SETS: Sets whose elements are input directly in the data file
set PERIODS circular;
set SECTORS; # sectors of the energy system (demand-side model)
set END_USES_INPUT; # Types of demand (end-uses). Input to the model (calculated by demand side model)
set END_USES_CATEGORIES; # Categories of demand (end-uses): electricity, heat, transport
set END_USES_TYPES_OF_CATEGORY {END_USES_CATEGORIES}; # Types of demand (end-uses).
set RESOURCES; # Resources are fuels and electricity imports 
set BIOFUELS_IMPORT within RESOURCES; # imported biofuels.
set EXPORT within RESOURCES; # exported resources
set END_USES_TYPES := union {i in END_USES_CATEGORIES} END_USES_TYPES_OF_CATEGORY [i]; # secondary set
set TECHNOLOGIES_OF_END_USES_TYPE {END_USES_TYPES}; # set all energy conversion technologies (excluding storage technologies)
set STORAGE_TECH; # set of storage technologies 
set INFRASTRUCTURE; # Infrastructure: DHN, grid, and intermediate energy conversion technologies

## SECONDARY SETS: a secondary set is defined by operations on MAIN SETS
set LAYERS := (RESOURCES diff BIOFUELS_IMPORT diff EXPORT) union END_USES_TYPES; # Layers are used to balance resources/products in the system
set TECHNOLOGIES := (union {i in END_USES_TYPES} TECHNOLOGIES_OF_END_USES_TYPE [i]) union STORAGE_TECH union INFRASTRUCTURE; 
set TECHNOLOGIES_OF_END_USES_CATEGORY {i in END_USES_CATEGORIES} within TECHNOLOGIES := union {j in END_USES_TYPES_OF_CATEGORY[i]} TECHNOLOGIES_OF_END_USES_TYPE [j]; 

## Additional SETS: only needed for printing out results
set COGEN within TECHNOLOGIES; # cogeneration tech
set BOILERS within TECHNOLOGIES; # cogeneration tech

### PARAMETERS ###
param end_uses_demand_year {END_USES_INPUT, SECTORS} >= 0 default 0; # table end-uses demand vs sectors (input from demand-side model). Yearly values.
param i_rate > 0; # discount rate (real discount rate)

# Share public vs private mobility
param share_mobility_public_min >= 0, <= 1; # % min limit for penetration of public mobility over total mobility 
param share_mobility_public_max >= 0, <= 1; # % max limit for penetration of public mobility over total mobility 

# Share train vs truck in freight transportation
param share_freight_train_min >= 0, <= 1; # % min limit for penetration of train in freight transportation
param share_freight_train_max >= 0, <= 1; # % max limit for penetration of train in freight transportation

# Share dhn vs decentralized for low-T heating
param share_heat_dhn_min >= 0, <= 1; # % min limit for penetration of dhn in low-T heating
param share_heat_dhn_max >= 0, <= 1; # % max limit for penetration of dhn in low-T heating

param period_duration {PERIODS}; # duration of each time period [h]
param lighting_month {PERIODS} >= 0, <= 1; # factor for sharing lighting across months (adding up to 1)
param heating_month {PERIODS} >= 0, <= 1; # factor for sharing space heating across months (adding up to 1)

# input/output Resources/Technologies to Layers. Reference is one unit [GW] or [Mpkm/h] of (main) output of the resource/technology. input to layer (output of technology) > 0.
param layers_in_out {RESOURCES union TECHNOLOGIES diff STORAGE_TECH, LAYERS}; 

# Attributes of TECHNOLOGIES
param ref_size {TECHNOLOGIES} >= 0; # reference size of each technology, expressed in the same units as the layers_in_out table. Refers to main output (heat for cogen technologies). storage level [GWh] for STORAGE_TECH
param c_inv {TECHNOLOGIES} >= 0; # Investment cost [MCHF/GW].[MCHF/GWh] for STORAGE_TECH
param c_maint {TECHNOLOGIES} >= 0; # O&M cost [MCHF/GW/year]: O&M cost does not include resource cost. [MCHF/GWh] for STORAGE_TECH
param lifetime {TECHNOLOGIES} >= 0; # [years]
param f_max {TECHNOLOGIES} >= 0; # Maximum feasible installed capacity [GW], refers to main output. storage level [GWh] for STORAGE_TECH
param f_min {TECHNOLOGIES} >= 0; # Minimum feasible installed capacity [GW], refers to main output. storage level [GWh] for STORAGE_TECH
param c_p_t {TECHNOLOGIES, PERIODS} >= 0, <= 1 default 1; # capacity factor of each technology and resource, defined on monthly basis. Different than 1 if F_Mult_t (t) <= c_p_t (t) * F_Mult
param c_p {TECHNOLOGIES} >= 0, <= 1 default 1; # capacity factor of each technology, defined on annual basis. Different than 1 if sum {t in PERIODS} F_Mult_t (t) * t_op (t) <= c_p * F_Mult
param tau {i in TECHNOLOGIES} := i_rate * (1 + i_rate)^lifetime [i] / (((1 + i_rate)^lifetime [i]) - 1); # Annualisation factor for each different technology
param gwp_constr {TECHNOLOGIES} >= 0; # GWP emissions associated to the construction of technologies [ktCO2-eq./GW]. Refers to GW of main output

# These two parameters could also not be defined. They simply make more intuitive the definition of lower/upper bounds for Mult_t
param fmax_perc {TECHNOLOGIES} >= 0, <= 1 default 1; # value in [0,1]: this is to fix that a technology can at max produce a certain % of the total output of its sector in each month
param fmin_perc {TECHNOLOGIES} >= 0, <= 1 default 0; # value in [0,1]: this is to fix that a technology can at min produce a certain % of the total output of its sector in each month

# Attributes of RESOURCES
param c_op {RESOURCES, PERIODS} >= 0; # cost of resources in the different periods [MCHF/GWh]
param avail {RESOURCES} >= 0; # Yearly availability of resources [GWh/y]
param gwp_op {RESOURCES} >= 0; # GWP emissions associated to the use of resources [ktCO2-eq./GWh]. Includes extraction/production/transportation and combution

# Attributes of STORAGE_TECH
param storage_eff_in {STORAGE_TECH, LAYERS} >= 0, <= 1; # efficiency of input to storage from layers.  If 0 storage_tech/layer incompatible
param storage_eff_out {STORAGE_TECH, LAYERS} >= 0, <= 1; # efficiency of output from storage to layers. If 0 storage_tech/layer incompatible

# Losses in the networks
param loss_coeff {END_USES_TYPES} >= 0 default 0; # 0 in all cases apart from 


## VARIABLES ###
var End_Uses_Input {END_USES_INPUT} >= 0; # total demand for each type of end-uses across sectors (yearly energy) as input from the demand-side model
var End_Uses {LAYERS, PERIODS} >= 0 default 0; # total demand for each type of end-uses (monthly power). Defined for all layers (0 if not demand) so that the balancing equations is more concise.
var Total_Time; # total duration sum over the different periods.
var Number_Of_Units {TECHNOLOGIES} integer; # number of units of size ref_size which are installed. No integer needed for transport
var F_Mult {TECHNOLOGIES} >= 0; # multiplication factor with respect to the values in param_in_out table
var F_Mult_t {RESOURCES union TECHNOLOGIES, PERIODS} >= 0; # multiplication factor (for each period) with respect to the values in layers_in_out table. Takes into account c_p
var C_inv {TECHNOLOGIES} >= 0; # Total investment cost of each technology
var C_maint {TECHNOLOGIES} >= 0; # Total O&M cost of each technology (excluding resource cost)
var C_op {RESOURCES} >= 0; # Total O&M cost of each resource
var Storage_In {i in STORAGE_TECH, LAYERS, PERIODS} >= 0; # Power [GW] input to the storage in a certain period
var Storage_Out {i in STORAGE_TECH, LAYERS, PERIODS} >= 0; # Power [GW] output from the storage in a certain period
var Share_Mobility_Public >= share_mobility_public_min, <= share_mobility_public_max; # % of passenger mobility attributed to public transportation
var Share_Freight_Train, >= share_freight_train_min, <= share_freight_train_max; # % of freight mobility attributed to train
var Share_Heat_Dhn, >= share_heat_dhn_min, <= share_heat_dhn_max; # % of low-T heat demand attributed to DHN
var Y_Solar_Backup {TECHNOLOGIES} binary default 0; # Binary variable. if 1, identifies the decentralized technology (only 1) which is backup for solar. 0 for all other technologies
var Losses {END_USES_TYPES, PERIODS} >= 0; # Losses in the networks (normally electricity grid and DHN)
var GWP_constr {TECHNOLOGIES} >= 0; # Total emissions of the technologies [ktCO2-eq.]
var GWP_op {RESOURCES} >= 0; # Total yearly emissions of the resources [ktCO2-eq./y]
var TotalGWP >= 0; # Total GWP emissions in the system [ktCO2-eq./y]
var TotalCost >= 0; # Total GWP emissions in the system [ktCO2-eq./y]

### CONSTRAINTS ###

## End-uses demand calculation constraints

# Total yearly demand for each type of end uses demand (as input from end-uses demand model)
subject to end_uses_input {i in END_USES_INPUT}:
	End_Uses_Input [i] = sum {s in SECTORS} (end_uses_demand_year [i,s]);
	
# Total time duration:
subject to total_t:
	Total_Time = sum {t in PERIODS} (period_duration [t]);

# From annual energy demand to monthly power demand. End_Uses is non-zero only for demand layers.
subject to end_uses_t {l in LAYERS, t in PERIODS}:
	End_Uses [l,t] = (if l == "ELECTRICITY" 
		then
			(End_Uses_Input[l] / Total_Time + End_Uses_Input["LIGHTING"] * lighting_month [t] / period_duration [t]) + Losses [l,t]
		else (if l == "HEAT_LOW_T_DHN" then
			(End_Uses_Input["HEAT_LOW_T_HW"] / Total_Time + End_Uses_Input["HEAT_LOW_T_SH"] * heating_month [t] / period_duration [t]) * Share_Heat_Dhn + Losses [l,t]
		else (if l == "HEAT_LOW_T_DECEN" then
			(End_Uses_Input["HEAT_LOW_T_HW"] / Total_Time + End_Uses_Input["HEAT_LOW_T_SH"] * heating_month [t] / period_duration [t]) * (1 - Share_Heat_Dhn)
		else (if l == "MOB_PUBLIC" then
			(End_Uses_Input["MOBILITY_PASSENGER"] / Total_Time) * Share_Mobility_Public
		else (if l == "MOB_PRIVATE" then
			(End_Uses_Input["MOBILITY_PASSENGER"] / Total_Time) * (1 - Share_Mobility_Public)
		else (if l == "MOB_FREIGHT_RAIL" then
			(End_Uses_Input["MOBILITY_FREIGHT"] / Total_Time) * Share_Freight_Train
		else (if l == "MOB_FREIGHT_ROAD" then
			(End_Uses_Input["MOBILITY_FREIGHT"] / Total_Time) * (1 - Share_Freight_Train)
		else (if l == "HEAT_HIGH_T" then
			End_Uses_Input[l] / Total_Time
		else 
			0 )))))))); # For all layers which don't have an end-use demand
	
## Multiplication factor

# Number of purchased technologies. Integer variable (so that we have only integer multiples of the reference size)
subject to number_of_units {i in TECHNOLOGIES diff INFRASTRUCTURE}:
	Number_Of_Units [i] = F_Mult [i] / ref_size [i]; 
	
# min & max limit to the size of each technology
subject to size_limit {i in TECHNOLOGIES}:
	f_min [i] <= F_Mult [i] <= f_max [i];
	
# relation between mult_t and mult through capacity factor. This forces max monthly output (e.g. renewables)
subject to capacity_factor_t {i in TECHNOLOGIES, t in PERIODS}:
	F_Mult_t [i, t] <= F_Mult [i] * c_p_t [i, t];
	
# relation between mult_t and mult through capacity factor. This one forces total annual output
subject to capacity_factor {i in TECHNOLOGIES}:
	sum {t in PERIODS} (F_Mult_t [i, t] * period_duration [t]) <= F_Mult [i] * c_p [i] * Total_Time;	


## Layers

# Layer balance equation with storage. Layers: input > 0, output < 0. Demand > 0. Storage: in > 0, out > 0;
# output from technologies/resources/storage - input to technologies/storage = demand. Demand has default value of 0 for layers which are not end_uses
subject to layer_balance {l in LAYERS, t in PERIODS}:
	0 = 
		sum {i in RESOURCES union TECHNOLOGIES diff STORAGE_TECH} (layers_in_out[i, l] * F_Mult_t [i, t]) 
		+ sum {j in STORAGE_TECH} (Storage_Out [j, l, t] - Storage_In [j, l, t])
		- End_Uses [l, t];

## Resources

# Resources availability equation
subject to resource_availability {i in RESOURCES}:
	sum {t in PERIODS} (F_Mult_t [i, t] * period_duration [t]) <= avail [i];

## Cost

# Investment cost of each technology
subject to investment_cost_calc {i in TECHNOLOGIES}: # add storage investment cost
	C_inv [i] = c_inv [i] * F_Mult [i];
		
# O&M cost of each technology
subject to main_cost_calc {i in TECHNOLOGIES}: # add storage investment
	C_maint [i] = c_maint [i] * F_Mult [i];		

# Total cost of each resource
subject to op_cost_calc {i in RESOURCES}:
	C_op [i] = sum {t in PERIODS} (c_op [i, t] * F_Mult_t [i, t] * period_duration [t]);
	
subject to totalcost_cal:
	TotalCost = sum {i in TECHNOLOGIES} (tau [i]  * C_inv [i] + C_maint [i]) + sum {j in RESOURCES} C_op [j];
		
## Emissions

subject to gwp_constr_calc {i in TECHNOLOGIES}:
	GWP_constr [i] = gwp_constr [i] * F_Mult [i];

subject to gwp_op_calc {i in RESOURCES}:
	GWP_op [i] = gwp_op [i] * sum {t in PERIODS} (period_duration [t] * F_Mult_t [i, t]);	

subject to totalGWP_calc:
	TotalGWP = sum {i in TECHNOLOGIES} (GWP_constr [i] / lifetime [i]) + sum {j in RESOURCES} GWP_op [j];

## Storage

# Each storage technology can have input/output only to certain layers. If incompatible then the variable is set to 0
# ceil (x) operator rounds a number to the highest nearest integer. 
subject to storage_layer_in {i in STORAGE_TECH, l in LAYERS, t in PERIODS}:
	Storage_In [i, l, t] * (ceil (storage_eff_in [i, l]) - 1) = 0;

subject to storage_layer_out {i in STORAGE_TECH, l in LAYERS, t in PERIODS}:
	Storage_Out [i, l, t] * (ceil (storage_eff_out [i, l]) - 1) = 0;

# Storage can't be a transfer unit in a given period: either output or input.
# Non linear formulation would be as follows:
# subject to storage_no_transfer {i in STORAGE_TECH, t in PERIODS}:
# 	ceil (sum {l in LAYERS: storage_eff_in [i,l] > 0} (Storage_In [i, l, t] * storage_eff_in_mult [i, l])  * period_duration [t] / f_max [i]) +
# 	ceil (sum {l in LAYERS: storage_eff_out [i,l] > 0} (Storage_Out [i, l, t] / storage_eff_out_mult [i, l])  * period_duration [t] / f_max [i]) <= 1;
# Could be written in a linear way as follows (3 equations):

var y_sto_in {STORAGE_TECH, PERIODS} binary;
var y_sto_out {STORAGE_TECH, PERIODS} binary;

# Equivalent to .../f_max <= y when f_max>0; when f_max=0 forces zero in/out (no division by zero).
subject to storage_no_transfer_1 {i in STORAGE_TECH, t in PERIODS}:
	(sum {l in LAYERS: storage_eff_in [i,l] > 0} (Storage_In [i, l, t] * storage_eff_in [i, l])) * period_duration [t] <= y_sto_in [i, t] * f_max [i];
	
subject to storage_no_transfer_2 {i in STORAGE_TECH, t in PERIODS}:
	(sum {l in LAYERS: storage_eff_out [i,l] > 0} (Storage_Out [i, l, t] / storage_eff_out [i, l])) * period_duration [t] <= y_sto_out [i, t] * f_max [i];

subject to storage_no_transfer_3 {i in STORAGE_TECH, t in PERIODS}:
	y_sto_in [i,t] + y_sto_out [i,t] <= 1;

# The level of the storage represents the amount of energy stored at a certain time.
subject to storage_level {i in STORAGE_TECH, t in PERIODS}:
	F_Mult_t [i, t] = F_Mult_t [i, prev(t)] + ((sum {l in LAYERS: storage_eff_in [i,l] > 0} (Storage_In [i, l, t] * storage_eff_in [i, l])) 
										- (sum {l in LAYERS: storage_eff_out [i,l] > 0} (Storage_Out [i, l, t] / storage_eff_out [i, l]))) * period_duration [t];
										
## Calculation of losses for each end-use demand type (normally for electricity and DHN)

subject to network_losses {i in END_USES_TYPES, t in PERIODS}:
#	Elec_Trans_Losses [t] = (End_Uses_Input["ELECTRICITY"] / Total_Time + End_Uses_Input["LIGHTING"] * lighting_month [t] / period_duration [t] + sum {i in TECHNOLOGIES diff STORAGE_TECH: layers_in_out [i, "ELECTRICITY"] < 0} (-layers_in_out[i, "ELECTRICITY"] * F_Mult_t [i, t])) * elec_trans_loss_coeff / (1 - elec_trans_loss_coeff);
# Rewriting above constraint in a more compact way. EndUses = ELEC + LIGHTING + Losses	
#	Elec_Trans_Losses [t] = (End_Uses["ELECTRICITY",t] + sum {i in TECHNOLOGIES diff STORAGE_TECH: layers_in_out [i, "ELECTRICITY"] < 0} (-layers_in_out[i, "ELECTRICITY"] * F_Mult_t [i, t])) * elec_trans_loss_coeff;
#	Elec_Trans_Losses [t] = (sum {i in RESOURCES union TECHNOLOGIES diff STORAGE_TECH: layers_in_out [i, "ELECTRICITY"] > 0} ((layers_in_out[i, "ELECTRICITY"]) * F_Mult_t [i, t])) * elec_trans_loss_coeff;
Losses [i,t] = (sum {j in RESOURCES union TECHNOLOGIES diff STORAGE_TECH: layers_in_out [j, i] > 0} ((layers_in_out[j, i]) * F_Mult_t [j, t])) * loss_coeff [i];

# Definition of min/max output of each technology as % of total output in a given layer. 
# Normally for a tech should use either f_max/f_min or f_max_%/f_min_%
subject to f_max_perc {i in END_USES_TYPES, j in TECHNOLOGIES_OF_END_USES_TYPE[i]}:
	sum {t in PERIODS} (F_Mult_t [j, t] * period_duration[t]) <= fmax_perc [j] * sum {j2 in TECHNOLOGIES_OF_END_USES_TYPE[i], t2 in PERIODS} (F_Mult_t [j2, t2] * period_duration [t2]);

subject to f_min_perc {i in END_USES_TYPES, j in TECHNOLOGIES_OF_END_USES_TYPE[i]}:
	sum {t in PERIODS} (F_Mult_t [j, t] * period_duration[t])  >= fmin_perc [j] * sum {j2 in TECHNOLOGIES_OF_END_USES_TYPE[i], t2 in PERIODS} (F_Mult_t [j2, t2] * period_duration [t2]);

# Operating strategy in the for decentralized heat supply (to make model more realistic)
# Output heat in each month proportional to installed capacity.
# When solar thermal is installed, it replaces one technology which is chosen as backup. The sum of the % production of solar + backup must respect the minimum share of the backup technology
# Here written in a compact non linear form, below it is linearized  
#subject to op_strategy_decen_1 {i in TECHNOLOGIES_OF_END_USES_TYPE["HEAT_LOW_T_DECEN"] diff {"DEC_SOLAR"}, t in PERIODS}:
#	F_Mult_t [i, t] + F_Mult_t ["DEC_SOLAR", t] * y_solar_backup [i] >= sum {t2 in PERIODS} (F_Mult_t [i, t2] * period_duration [t2]) * ((End_Uses_Input["HEAT_LOW_T_HW"] / Total_Time + End_Uses_Input["HEAT_LOW_T_SH"] * heating_month [t] / period_duration [t]) / (End_Uses_Input["HEAT_LOW_T_HW"] + End_Uses_Input["HEAT_LOW_T_SH"]));

# linearization of op_strategy_decen_1
# Auxiliary variable 
var X_Solar_Backup_Aux {TECHNOLOGIES_OF_END_USES_TYPE["HEAT_LOW_T_DECEN"] diff {"DEC_SOLAR"}, t in PERIODS} >= 0;

subject to op_strategy_decen_1_linear {i in TECHNOLOGIES_OF_END_USES_TYPE["HEAT_LOW_T_DECEN"] diff {"DEC_SOLAR"}, t in PERIODS}:
	F_Mult_t [i, t] + X_Solar_Backup_Aux [i, t] >= sum {t2 in PERIODS} (F_Mult_t [i, t2] * period_duration [t2]) * ((End_Uses_Input["HEAT_LOW_T_HW"] / Total_Time + End_Uses_Input["HEAT_LOW_T_SH"] * heating_month [t] / period_duration [t]) / (End_Uses_Input["HEAT_LOW_T_HW"] + End_Uses_Input["HEAT_LOW_T_SH"]));

# These three constraints impose that: X_solar_backup_aux [i, t] = F_Mult_t ["DEC_SOLAR", t] * y_solar_backup [i]
# from: http://www.leandro-coelho.com/linearization-product-variables/
subject to op_strategy_decen_1_linear_1 {i in TECHNOLOGIES_OF_END_USES_TYPE["HEAT_LOW_T_DECEN"] diff {"DEC_SOLAR"}, t in PERIODS}:
	X_Solar_Backup_Aux [i, t] <= f_max ["DEC_SOLAR"] * Y_Solar_Backup [i];

subject to op_strategy_decen_1_linear_2 {i in TECHNOLOGIES_OF_END_USES_TYPE["HEAT_LOW_T_DECEN"] diff {"DEC_SOLAR"}, t in PERIODS}:
	X_Solar_Backup_Aux [i, t] <= F_Mult_t ["DEC_SOLAR", t];

subject to op_strategy_decen_1_linear_3 {i in TECHNOLOGIES_OF_END_USES_TYPE["HEAT_LOW_T_DECEN"] diff {"DEC_SOLAR"}, t in PERIODS}:
	X_Solar_Backup_Aux [i, t] >= F_Mult_t ["DEC_SOLAR", t] - (1 - Y_Solar_Backup [i]) * f_max ["DEC_SOLAR"];

# Only one technology can be backup of solar
subject to op_strategy_decen_2:
	sum {i in TECHNOLOGIES} Y_Solar_Backup [i] <= 1;

## Constraints needed for the application to CH/specific to the current version of the model (not needed in standard formulation)

## Seasonal storage in hydro dams.
# When installed power of new dams 0 -> 0.44, maximum storage capacity changes linearly 0 -> 2400 GWh
# If f_max["NEW_HYDRO_DAM"] == f_min["NEW_HYDRO_DAM"] (e.g. drought scenario with no new dam capacity), RHS is 0.
subject to storage_level_hydro_dams: 
	F_Mult ["PUMPED_HYDRO"] <= (if f_max ["NEW_HYDRO_DAM"] > f_min ["NEW_HYDRO_DAM"] then f_max ["PUMPED_HYDRO"] * (F_Mult ["NEW_HYDRO_DAM"] - f_min ["NEW_HYDRO_DAM"]) / (f_max ["NEW_HYDRO_DAM"] - f_min ["NEW_HYDRO_DAM"]) else 0);

# Hydro dams can only shift production. Efficiency is 1, "storage" is actually only avoided production shifted to different months
subject to hydro_dams_shift {t in PERIODS}: 
	Storage_In ["PUMPED_HYDRO", "ELECTRICITY", t] <= (F_Mult_t ["HYDRO_DAM", t] + F_Mult_t ["NEW_HYDRO_DAM", t]);

## DHN: assigning a cost to the network	
subject to extra_dhn:
	F_Mult ["DHN"] = sum {j in TECHNOLOGIES_OF_END_USES_TYPE["HEAT_LOW_T_DHN"]} (F_Mult [j]);

var Max_Heat_Demand_DHN >= 0;

# Calculation of max heat demand in DHN 
subject to max_dhn_heat_demand {t in PERIODS}:
	Max_Heat_Demand_DHN >= End_Uses ["HEAT_LOW_T_DHN", t];

param peak_dhn_factor >= 0;

# Peak in DHN: assumed to be 2x of the peak demand
subject to peak_dhn:
	sum {j in TECHNOLOGIES_OF_END_USES_TYPE["HEAT_LOW_T_DHN"]} (F_Mult [j]) >= peak_dhn_factor * Max_Heat_Demand_DHN;

## Additional constraints
# In this way the cost remains fixed in all scenarios
subject to extra_efficiency:
	F_Mult ["EFFICIENCY"] = 1 / (1 + i_rate);

# 9.4 BCHF is the extra investment needed if there is a big deployment of stochastic renewables
subject to extra_grid:
	F_Mult ["GRID"] = 1 + (9400 / c_inv["GRID"]) * (F_Mult ["WIND"] + F_Mult ["PV"]) / (f_max ["WIND"] + f_max ["PV"]);

# Power2Gas investment cost is calculated on the max size of the two units
subject to extra_power2gas_1:
	F_Mult ["POWER2GAS_3"] >= F_Mult ["POWER2GAS_1"];
	
subject to extra_power2gas_2:
	F_Mult ["POWER2GAS_3"] >= F_Mult ["POWER2GAS_2"];

# Operating strategy in private mobility (to make model more realistic)
# Mobility share is fixed as constant in the different months. This constraint is needed only if c_inv = 0 for mobility.
subject to op_strategy_mob_private {i in TECHNOLOGIES_OF_END_USES_CATEGORY["MOBILITY_PASSENGER"] union TECHNOLOGIES_OF_END_USES_CATEGORY["MOBILITY_FREIGHT"], t in PERIODS}:
	F_Mult_t [i, t]  >= sum {t2 in PERIODS} (F_Mult_t [i, t2] * period_duration [t2] / Total_Time);

### OBJECTIVE FUNCTION ###

minimize obj: TotalCost;
