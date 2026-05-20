package database

import (
	"aquadock/internal/models"
	"fmt"
)

func (db *DB) CreateWaterParam(p *models.WaterParamCreate) (*models.WaterParam, error) {
	testedAt := p.TestedAt
	if testedAt == "" {
		testedAt = "datetime('now')"
	} else {
		testedAt = "'" + testedAt + "'"
	}
	res, err := db.Exec(fmt.Sprintf(`INSERT INTO water_params (tank_id, tested_at, ammonia, nitrite, nitrate, ph, temperature, gh, kh, notes)
		VALUES (?, %s, ?, ?, ?, ?, ?, ?, ?, ?)`, testedAt),
		p.TankID, p.Ammonia, p.Nitrite, p.Nitrate, p.Ph, p.Temperature, p.Gh, p.Kh, p.Notes)
	if err != nil {
		return nil, fmt.Errorf("create param: %w", err)
	}
	id, _ := res.LastInsertId()
	return db.GetWaterParam(id)
}

func (db *DB) GetWaterParam(id int64) (*models.WaterParam, error) {
	var p models.WaterParam
	err := db.QueryRow(`SELECT id, tank_id, tested_at, ammonia, nitrite, nitrate, ph, temperature, gh, kh, COALESCE(notes,'') FROM water_params WHERE id = ?`, id).
		Scan(&p.ID, &p.TankID, &p.TestedAt, &p.Ammonia, &p.Nitrite, &p.Nitrate, &p.Ph, &p.Temperature, &p.Gh, &p.Kh, &p.Notes)
	if err != nil {
		return nil, fmt.Errorf("get param: %w", err)
	}
	return &p, nil
}

func (db *DB) ListWaterParams(tankID int64, limit int) ([]models.WaterParam, error) {
	if limit <= 0 { limit = 30 }
	rows, err := db.Query(`SELECT id, tank_id, tested_at, ammonia, nitrite, nitrate, ph, temperature, gh, kh, COALESCE(notes,'') FROM water_params WHERE tank_id = ? ORDER BY tested_at DESC LIMIT ?`, tankID, limit)
	if err != nil {
		return nil, fmt.Errorf("list params: %w", err)
	}
	defer rows.Close()

	var params []models.WaterParam
	for rows.Next() {
		var p models.WaterParam
		if err := rows.Scan(&p.ID, &p.TankID, &p.TestedAt, &p.Ammonia, &p.Nitrite, &p.Nitrate, &p.Ph, &p.Temperature, &p.Gh, &p.Kh, &p.Notes); err != nil {
			return nil, fmt.Errorf("scan param: %w", err)
		}
		params = append(params, p)
	}
	return params, nil
}

func (db *DB) GetLatestWaterParam(tankID int64) (*models.WaterParam, error) {
	var p models.WaterParam
	err := db.QueryRow(`SELECT id, tank_id, tested_at, ammonia, nitrite, nitrate, ph, temperature, gh, kh, COALESCE(notes,'') FROM water_params WHERE tank_id = ? ORDER BY tested_at DESC LIMIT 1`, tankID).
		Scan(&p.ID, &p.TankID, &p.TestedAt, &p.Ammonia, &p.Nitrite, &p.Nitrate, &p.Ph, &p.Temperature, &p.Gh, &p.Kh, &p.Notes)
	if err != nil {
		return nil, fmt.Errorf("get latest param: %w", err)
	}
	return &p, nil
}

func (db *DB) DeleteWaterParam(id int64) error {
	_, err := db.Exec("DELETE FROM water_params WHERE id = ?", id)
	return err
}

func (db *DB) GetParamRange(subtype string) (*models.ParamRange, error) {
	var r models.ParamRange
	err := db.QueryRow(`SELECT id, tank_subtype, ammonia_min, ammonia_max, nitrite_min, nitrite_max, nitrate_min, nitrate_max, ph_min, ph_max, temp_min, temp_max, gh_min, gh_max, kh_min, kh_max FROM param_ranges WHERE tank_subtype = ?`, subtype).
		Scan(&r.ID, &r.TankSubtype, &r.AmmoniaMin, &r.AmmoniaMax, &r.NitriteMin, &r.NitriteMax, &r.NitrateMin, &r.NitrateMax, &r.PhMin, &r.PhMax, &r.TempMin, &r.TempMax, &r.GhMin, &r.GhMax, &r.KhMin, &r.KhMax)
	if err != nil {
		return nil, fmt.Errorf("get param range: %w", err)
	}
	return &r, nil
}

func (db *DB) ListParamRanges() ([]models.ParamRange, error) {
	rows, err := db.Query(`SELECT id, tank_subtype, ammonia_min, ammonia_max, nitrite_min, nitrite_max, nitrate_min, nitrate_max, ph_min, ph_max, temp_min, temp_max, gh_min, gh_max, kh_min, kh_max FROM param_ranges ORDER BY tank_subtype`)
	if err != nil {
		return nil, fmt.Errorf("list param ranges: %w", err)
	}
	defer rows.Close()

	var ranges []models.ParamRange
	for rows.Next() {
		var r models.ParamRange
		if err := rows.Scan(&r.ID, &r.TankSubtype, &r.AmmoniaMin, &r.AmmoniaMax, &r.NitriteMin, &r.NitriteMax, &r.NitrateMin, &r.NitrateMax, &r.PhMin, &r.PhMax, &r.TempMin, &r.TempMax, &r.GhMin, &r.GhMax, &r.KhMin, &r.KhMax); err != nil {
			return nil, fmt.Errorf("scan param range: %w", err)
		}
		ranges = append(ranges, r)
	}
	return ranges, nil
}

func (db *DB) UpdateParamRange(r *models.ParamRange) error {
	_, err := db.Exec(`UPDATE param_ranges SET
		ammonia_min=?, ammonia_max=?, nitrite_min=?, nitrite_max=?, nitrate_min=?, nitrate_max=?,
		ph_min=?, ph_max=?, temp_min=?, temp_max=?, gh_min=?, gh_max=?, kh_min=?, kh_max=?
		WHERE tank_subtype=?`,
		r.AmmoniaMin, r.AmmoniaMax, r.NitriteMin, r.NitriteMax, r.NitrateMin, r.NitrateMax,
		r.PhMin, r.PhMax, r.TempMin, r.TempMax, r.GhMin, r.GhMax, r.KhMin, r.KhMax,
		r.TankSubtype)
	return err
}
