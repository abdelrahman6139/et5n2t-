--
-- PostgreSQL database dump
--



-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

-- Started on 2026-03-08 13:22:26

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 5331 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- TOC entry 911 (class 1247 OID 106469)
-- Name: order_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.order_status AS ENUM (
    'Pending',
    'Confirmed',
    'Preparing',
    'Delivering',
    'Completed',
    'Cancelled',
    'OutForDelivery'
);


ALTER TYPE public.order_status OWNER TO postgres;

--
-- TOC entry 914 (class 1247 OID 106484)
-- Name: printer_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.printer_type AS ENUM (
    'Printer',
    'KDS'
);


ALTER TYPE public.printer_type OWNER TO postgres;

--
-- TOC entry 917 (class 1247 OID 106490)
-- Name: sales_center; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sales_center AS ENUM (
    'DineIn',
    'Takeaway',
    'Delivery'
);


ALTER TYPE public.sales_center OWNER TO postgres;

--
-- TOC entry 278 (class 1255 OID 106497)
-- Name: fn_recalc_order_total(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.fn_recalc_order_total() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  UPDATE orders o
  SET total = COALESCE((
      SELECT SUM(total) FROM order_items oi WHERE oi.order_id = o.id
  ),0)
  WHERE o.id = NEW.order_id;
  RETURN NEW;
END; $$;


ALTER FUNCTION public.fn_recalc_order_total() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 219 (class 1259 OID 106498)
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(255) NOT NULL,
    details text,
    ip_address character varying(45),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    entity_type character varying(50),
    entity_id integer
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 106506)
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO postgres;

--
-- TOC entry 5333 (class 0 OID 0)
-- Dependencies: 220
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- TOC entry 221 (class 1259 OID 106507)
-- Name: business_days; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.business_days (
    id integer NOT NULL,
    opened_at timestamp with time zone DEFAULT now(),
    closed_at timestamp with time zone,
    opened_by_id integer,
    opened_by_name character varying(150),
    closed_by_id integer,
    closed_by_name character varying(150),
    status character varying(20) DEFAULT 'open'::character varying,
    total_orders integer DEFAULT 0,
    total_sales numeric(12,2) DEFAULT 0,
    total_cash numeric(12,2) DEFAULT 0,
    total_card numeric(12,2) DEFAULT 0,
    total_delivery numeric(12,2) DEFAULT 0,
    total_expenses numeric(12,2) DEFAULT 0,
    net_profit numeric(12,2) DEFAULT 0,
    notes text
);


ALTER TABLE public.business_days OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 106522)
-- Name: business_days_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.business_days_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.business_days_id_seq OWNER TO postgres;

--
-- TOC entry 5334 (class 0 OID 0)
-- Dependencies: 222
-- Name: business_days_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.business_days_id_seq OWNED BY public.business_days.id;


--
-- TOC entry 223 (class 1259 OID 106523)
-- Name: categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.categories (
    id bigint NOT NULL,
    name text NOT NULL,
    sub_category_id bigint NOT NULL
);


ALTER TABLE public.categories OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 106531)
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.categories_id_seq OWNER TO postgres;

--
-- TOC entry 5335 (class 0 OID 0)
-- Dependencies: 224
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- TOC entry 225 (class 1259 OID 106532)
-- Name: customer_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customer_locations (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    location_name character varying(100) NOT NULL,
    street character varying(255),
    building character varying(50),
    floor character varying(50),
    apartment character varying(50),
    landmark character varying(255),
    latitude numeric(10,6),
    longitude numeric(11,6),
    is_default boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    zone_id integer,
    kind character varying(50) DEFAULT 'Home'::character varying
);


ALTER TABLE public.customer_locations OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 106544)
-- Name: customer_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customer_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customer_locations_id_seq OWNER TO postgres;

--
-- TOC entry 5336 (class 0 OID 0)
-- Dependencies: 226
-- Name: customer_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customer_locations_id_seq OWNED BY public.customer_locations.id;


--
-- TOC entry 227 (class 1259 OID 106545)
-- Name: customers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.customers (
    id bigint NOT NULL,
    phone text,
    first_name text,
    last_name text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    last_zone_id integer
);


ALTER TABLE public.customers OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 106552)
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.customers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.customers_id_seq OWNER TO postgres;

--
-- TOC entry 5337 (class 0 OID 0)
-- Dependencies: 228
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- TOC entry 229 (class 1259 OID 106553)
-- Name: delivery_zones; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.delivery_zones (
    id bigint NOT NULL,
    name text NOT NULL,
    delivery_fee numeric(10,2) DEFAULT 15 NOT NULL,
    geojson jsonb NOT NULL
);


ALTER TABLE public.delivery_zones OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 106563)
-- Name: delivery_zones_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.delivery_zones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.delivery_zones_id_seq OWNER TO postgres;

--
-- TOC entry 5338 (class 0 OID 0)
-- Dependencies: 230
-- Name: delivery_zones_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.delivery_zones_id_seq OWNED BY public.delivery_zones.id;


--
-- TOC entry 231 (class 1259 OID 106564)
-- Name: tables; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tables (
    id bigint NOT NULL,
    name text NOT NULL,
    hall_id bigint NOT NULL,
    capacity integer DEFAULT 4
);


ALTER TABLE public.tables OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 106573)
-- Name: dining_tables_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.dining_tables_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.dining_tables_id_seq OWNER TO postgres;

--
-- TOC entry 5339 (class 0 OID 0)
-- Dependencies: 232
-- Name: dining_tables_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.dining_tables_id_seq OWNED BY public.tables.id;


--
-- TOC entry 233 (class 1259 OID 106574)
-- Name: driver_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.driver_locations (
    id integer NOT NULL,
    driver_id character varying(50) NOT NULL,
    order_id character varying(50),
    driver_lat numeric(10,8) NOT NULL,
    driver_lng numeric(11,8) NOT NULL,
    dest_lat numeric(10,8),
    dest_lng numeric(11,8),
    leg character varying(20),
    status character varying(20) DEFAULT 'available'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.driver_locations OWNER TO postgres;

--
-- TOC entry 234 (class 1259 OID 106584)
-- Name: driver_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.driver_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.driver_locations_id_seq OWNER TO postgres;

--
-- TOC entry 5340 (class 0 OID 0)
-- Dependencies: 234
-- Name: driver_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.driver_locations_id_seq OWNED BY public.driver_locations.id;


--
-- TOC entry 235 (class 1259 OID 106585)
-- Name: drivers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.drivers (
    id bigint NOT NULL,
    name text NOT NULL,
    phone text,
    vehicle_type character varying(50),
    license_plate character varying(50),
    status character varying(20) DEFAULT 'available'::character varying,
    latitude numeric(10,7),
    longitude numeric(10,7),
    last_updated timestamp without time zone,
    password_hash character varying(255),
    created_at timestamp without time zone DEFAULT now(),
    password character varying(255),
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.drivers OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 106596)
-- Name: drivers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.drivers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.drivers_id_seq OWNER TO postgres;

--
-- TOC entry 5341 (class 0 OID 0)
-- Dependencies: 236
-- Name: drivers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.drivers_id_seq OWNED BY public.drivers.id;


--
-- TOC entry 237 (class 1259 OID 106597)
-- Name: employees; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.employees (
    id bigint NOT NULL,
    name text NOT NULL,
    role text NOT NULL,
    phone text
);


ALTER TABLE public.employees OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 106605)
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.employees_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.employees_id_seq OWNER TO postgres;

--
-- TOC entry 5342 (class 0 OID 0)
-- Dependencies: 238
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- TOC entry 239 (class 1259 OID 106606)
-- Name: expenses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    category character varying(100) NOT NULL,
    description text,
    amount numeric(10,2) NOT NULL,
    payment_method character varying(50),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    shift_id integer
);


ALTER TABLE public.expenses OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 106618)
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expenses_id_seq OWNER TO postgres;

--
-- TOC entry 5343 (class 0 OID 0)
-- Dependencies: 240
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- TOC entry 241 (class 1259 OID 106619)
-- Name: halls; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.halls (
    id bigint NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.halls OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 106626)
-- Name: halls_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.halls_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.halls_id_seq OWNER TO postgres;

--
-- TOC entry 5344 (class 0 OID 0)
-- Dependencies: 242
-- Name: halls_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.halls_id_seq OWNED BY public.halls.id;


--
-- TOC entry 243 (class 1259 OID 106627)
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.inventory_items (
    id bigint NOT NULL,
    name text NOT NULL,
    unit text,
    stock numeric(14,3) DEFAULT 0 NOT NULL,
    cost numeric(12,2) DEFAULT 0 NOT NULL,
    supplier_id bigint
);


ALTER TABLE public.inventory_items OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 106638)
-- Name: inventory_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.inventory_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.inventory_items_id_seq OWNER TO postgres;

--
-- TOC entry 5345 (class 0 OID 0)
-- Dependencies: 244
-- Name: inventory_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.inventory_items_id_seq OWNED BY public.inventory_items.id;


--
-- TOC entry 245 (class 1259 OID 106639)
-- Name: kitchens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.kitchens (
    id bigint NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.kitchens OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 106646)
-- Name: kitchens_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.kitchens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.kitchens_id_seq OWNER TO postgres;

--
-- TOC entry 5346 (class 0 OID 0)
-- Dependencies: 246
-- Name: kitchens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.kitchens_id_seq OWNED BY public.kitchens.id;


--
-- TOC entry 247 (class 1259 OID 106647)
-- Name: main_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.main_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.main_categories OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 106653)
-- Name: main_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.main_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.main_categories_id_seq OWNER TO postgres;

--
-- TOC entry 5347 (class 0 OID 0)
-- Dependencies: 248
-- Name: main_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.main_categories_id_seq OWNED BY public.main_categories.id;


--
-- TOC entry 249 (class 1259 OID 106654)
-- Name: menu_item_note_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_item_note_options (
    menu_item_id integer NOT NULL,
    note_option_id integer NOT NULL
);


ALTER TABLE public.menu_item_note_options OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 106659)
-- Name: menu_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.menu_items (
    id bigint NOT NULL,
    name text NOT NULL,
    price numeric(12,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    category_id integer,
    printer character varying(100) DEFAULT 'Kitchen'::character varying,
    image_url text,
    main_category_id integer,
    sub_category_id integer
);


ALTER TABLE public.menu_items OWNER TO postgres;

--
-- TOC entry 251 (class 1259 OID 106671)
-- Name: menu_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.menu_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menu_items_id_seq OWNER TO postgres;

--
-- TOC entry 5348 (class 0 OID 0)
-- Dependencies: 251
-- Name: menu_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.menu_items_id_seq OWNED BY public.menu_items.id;


--
-- TOC entry 252 (class 1259 OID 106672)
-- Name: note_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.note_options (
    id integer NOT NULL,
    name text NOT NULL,
    price numeric(10,2) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.note_options OWNER TO postgres;

--
-- TOC entry 253 (class 1259 OID 106684)
-- Name: note_options_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.note_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.note_options_id_seq OWNER TO postgres;

--
-- TOC entry 5349 (class 0 OID 0)
-- Dependencies: 253
-- Name: note_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.note_options_id_seq OWNED BY public.note_options.id;


--
-- TOC entry 254 (class 1259 OID 106685)
-- Name: order_item_note_options; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_item_note_options (
    id integer NOT NULL,
    order_item_id integer NOT NULL,
    note_option_id integer NOT NULL,
    name_snapshot text NOT NULL,
    price_snapshot numeric(10,2) DEFAULT 0 NOT NULL
);


ALTER TABLE public.order_item_note_options OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 106696)
-- Name: order_item_note_options_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_item_note_options_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_item_note_options_id_seq OWNER TO postgres;

--
-- TOC entry 5350 (class 0 OID 0)
-- Dependencies: 255
-- Name: order_item_note_options_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_item_note_options_id_seq OWNED BY public.order_item_note_options.id;


--
-- TOC entry 256 (class 1259 OID 106697)
-- Name: order_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.order_items (
    id bigint NOT NULL,
    order_id bigint NOT NULL,
    item_id bigint NOT NULL,
    name_snapshot text NOT NULL,
    price numeric(12,2) NOT NULL,
    quantity numeric(12,3) NOT NULL,
    total numeric(12,2) NOT NULL,
    price_at_order numeric(10,2),
    notes text,
    CONSTRAINT order_items_quantity_check CHECK ((quantity > (0)::numeric))
);


ALTER TABLE public.order_items OWNER TO postgres;

--
-- TOC entry 257 (class 1259 OID 106710)
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.order_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.order_items_id_seq OWNER TO postgres;

--
-- TOC entry 5351 (class 0 OID 0)
-- Dependencies: 257
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- TOC entry 258 (class 1259 OID 106711)
-- Name: orders; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.orders (
    id bigint NOT NULL,
    order_no text,
    sales_center public.sales_center NOT NULL,
    status public.order_status DEFAULT 'Pending'::public.order_status NOT NULL,
    customer_id bigint,
    driver_id bigint,
    hall_id bigint,
    table_id bigint,
    total numeric(12,2) DEFAULT 0 NOT NULL,
    service_charge numeric(12,2) DEFAULT 0 NOT NULL,
    delivery_fee numeric(12,2) DEFAULT 0 NOT NULL,
    discount numeric(12,2) DEFAULT 0 NOT NULL,
    tax numeric(12,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_facing_id character varying(50),
    subtotal numeric(10,2) DEFAULT 0,
    service_fee numeric(10,2) DEFAULT 0,
    payment_method character varying(50),
    order_type character varying(20) DEFAULT 'dine-in'::character varying,
    customer_address text,
    customer_phone character varying(20),
    latitude numeric(10,8),
    longitude numeric(11,8),
    shift_id integer,
    customer_location_id integer,
    version integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.orders OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 106737)
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.orders_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.orders_id_seq OWNER TO postgres;

--
-- TOC entry 5352 (class 0 OID 0)
-- Dependencies: 259
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- TOC entry 260 (class 1259 OID 106738)
-- Name: printers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.printers (
    id bigint NOT NULL,
    name text NOT NULL,
    type public.printer_type DEFAULT 'Printer'::public.printer_type NOT NULL,
    kitchen_id bigint NOT NULL
);


ALTER TABLE public.printers OWNER TO postgres;

--
-- TOC entry 261 (class 1259 OID 106748)
-- Name: printers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.printers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.printers_id_seq OWNER TO postgres;

--
-- TOC entry 5353 (class 0 OID 0)
-- Dependencies: 261
-- Name: printers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.printers_id_seq OWNED BY public.printers.id;


--
-- TOC entry 262 (class 1259 OID 106749)
-- Name: recipe_ingredients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipe_ingredients (
    id integer NOT NULL,
    recipe_id integer NOT NULL,
    inventory_item_id integer NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit character varying(50),
    cost_per_unit numeric(10,3),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.recipe_ingredients OWNER TO postgres;

--
-- TOC entry 263 (class 1259 OID 106757)
-- Name: recipe_ingredients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recipe_ingredients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recipe_ingredients_id_seq OWNER TO postgres;

--
-- TOC entry 5354 (class 0 OID 0)
-- Dependencies: 263
-- Name: recipe_ingredients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recipe_ingredients_id_seq OWNED BY public.recipe_ingredients.id;


--
-- TOC entry 264 (class 1259 OID 106758)
-- Name: recipes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.recipes (
    id integer NOT NULL,
    menu_item_id integer,
    name character varying(255) NOT NULL,
    description text,
    total_cost numeric(10,3) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.recipes OWNER TO postgres;

--
-- TOC entry 265 (class 1259 OID 106768)
-- Name: recipes_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.recipes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.recipes_id_seq OWNER TO postgres;

--
-- TOC entry 5355 (class 0 OID 0)
-- Dependencies: 265
-- Name: recipes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.recipes_id_seq OWNED BY public.recipes.id;


--
-- TOC entry 266 (class 1259 OID 106769)
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id bigint NOT NULL,
    name text NOT NULL
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- TOC entry 267 (class 1259 OID 106776)
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO postgres;

--
-- TOC entry 5356 (class 0 OID 0)
-- Dependencies: 267
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- TOC entry 268 (class 1259 OID 106777)
-- Name: settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.settings (
    key character varying(50) NOT NULL,
    value text NOT NULL,
    description text
);


ALTER TABLE public.settings OWNER TO postgres;

--
-- TOC entry 269 (class 1259 OID 106784)
-- Name: shifts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.shifts (
    id integer NOT NULL,
    user_id integer,
    cashier_name character varying(100),
    opened_at timestamp without time zone DEFAULT now(),
    closed_at timestamp without time zone,
    opening_cash numeric(10,2) DEFAULT 0,
    closing_cash numeric(10,2),
    expected_cash numeric(10,2),
    cash_difference numeric(10,2),
    total_sales numeric(10,2) DEFAULT 0,
    total_cash numeric(10,2) DEFAULT 0,
    total_visa numeric(10,2) DEFAULT 0,
    total_delivery numeric(10,2) DEFAULT 0,
    total_expenses numeric(10,2) DEFAULT 0,
    total_orders integer DEFAULT 0,
    status character varying(20) DEFAULT 'open'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.shifts OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 106800)
-- Name: shifts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.shifts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.shifts_id_seq OWNER TO postgres;

--
-- TOC entry 5357 (class 0 OID 0)
-- Dependencies: 270
-- Name: shifts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.shifts_id_seq OWNED BY public.shifts.id;


--
-- TOC entry 271 (class 1259 OID 106801)
-- Name: sub_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sub_categories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    main_category_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sub_categories OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 106808)
-- Name: sub_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sub_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sub_categories_id_seq OWNER TO postgres;

--
-- TOC entry 5358 (class 0 OID 0)
-- Dependencies: 272
-- Name: sub_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sub_categories_id_seq OWNED BY public.sub_categories.id;


--
-- TOC entry 273 (class 1259 OID 106809)
-- Name: suppliers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.suppliers (
    id bigint NOT NULL,
    name text NOT NULL,
    contact_person text,
    phone text,
    email text
);


ALTER TABLE public.suppliers OWNER TO postgres;

--
-- TOC entry 274 (class 1259 OID 106816)
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.suppliers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO postgres;

--
-- TOC entry 5359 (class 0 OID 0)
-- Dependencies: 274
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- TOC entry 275 (class 1259 OID 106817)
-- Name: user_roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_roles (
    user_id bigint NOT NULL,
    role_id bigint NOT NULL
);


ALTER TABLE public.user_roles OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 106822)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    username text NOT NULL,
    role text DEFAULT 'Cashier'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    password character varying(255),
    is_active boolean DEFAULT true,
    full_name character varying(150),
    email character varying(150),
    phone character varying(20)
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 277 (class 1259 OID 106834)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5360 (class 0 OID 0)
-- Dependencies: 277
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4966 (class 2604 OID 106835)
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- TOC entry 4968 (class 2604 OID 106836)
-- Name: business_days id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_days ALTER COLUMN id SET DEFAULT nextval('public.business_days_id_seq'::regclass);


--
-- TOC entry 4978 (class 2604 OID 106837)
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- TOC entry 4979 (class 2604 OID 106838)
-- Name: customer_locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_locations ALTER COLUMN id SET DEFAULT nextval('public.customer_locations_id_seq'::regclass);


--
-- TOC entry 4984 (class 2604 OID 106839)
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- TOC entry 4986 (class 2604 OID 106840)
-- Name: delivery_zones id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_zones ALTER COLUMN id SET DEFAULT nextval('public.delivery_zones_id_seq'::regclass);


--
-- TOC entry 4990 (class 2604 OID 106841)
-- Name: driver_locations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_locations ALTER COLUMN id SET DEFAULT nextval('public.driver_locations_id_seq'::regclass);


--
-- TOC entry 4994 (class 2604 OID 106842)
-- Name: drivers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers ALTER COLUMN id SET DEFAULT nextval('public.drivers_id_seq'::regclass);


--
-- TOC entry 4998 (class 2604 OID 106843)
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- TOC entry 4999 (class 2604 OID 106844)
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- TOC entry 5003 (class 2604 OID 106845)
-- Name: halls id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.halls ALTER COLUMN id SET DEFAULT nextval('public.halls_id_seq'::regclass);


--
-- TOC entry 5004 (class 2604 OID 106846)
-- Name: inventory_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items ALTER COLUMN id SET DEFAULT nextval('public.inventory_items_id_seq'::regclass);


--
-- TOC entry 5007 (class 2604 OID 106847)
-- Name: kitchens id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kitchens ALTER COLUMN id SET DEFAULT nextval('public.kitchens_id_seq'::regclass);


--
-- TOC entry 5008 (class 2604 OID 106848)
-- Name: main_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.main_categories ALTER COLUMN id SET DEFAULT nextval('public.main_categories_id_seq'::regclass);


--
-- TOC entry 5010 (class 2604 OID 106849)
-- Name: menu_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items ALTER COLUMN id SET DEFAULT nextval('public.menu_items_id_seq'::regclass);


--
-- TOC entry 5014 (class 2604 OID 106850)
-- Name: note_options id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.note_options ALTER COLUMN id SET DEFAULT nextval('public.note_options_id_seq'::regclass);


--
-- TOC entry 5018 (class 2604 OID 106851)
-- Name: order_item_note_options id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item_note_options ALTER COLUMN id SET DEFAULT nextval('public.order_item_note_options_id_seq'::regclass);


--
-- TOC entry 5020 (class 2604 OID 106852)
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- TOC entry 5021 (class 2604 OID 106853)
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- TOC entry 5033 (class 2604 OID 106854)
-- Name: printers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printers ALTER COLUMN id SET DEFAULT nextval('public.printers_id_seq'::regclass);


--
-- TOC entry 5035 (class 2604 OID 106855)
-- Name: recipe_ingredients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_ingredients ALTER COLUMN id SET DEFAULT nextval('public.recipe_ingredients_id_seq'::regclass);


--
-- TOC entry 5037 (class 2604 OID 106856)
-- Name: recipes id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes ALTER COLUMN id SET DEFAULT nextval('public.recipes_id_seq'::regclass);


--
-- TOC entry 5041 (class 2604 OID 106857)
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- TOC entry 5042 (class 2604 OID 106858)
-- Name: shifts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts ALTER COLUMN id SET DEFAULT nextval('public.shifts_id_seq'::regclass);


--
-- TOC entry 5053 (class 2604 OID 106859)
-- Name: sub_categories id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_categories ALTER COLUMN id SET DEFAULT nextval('public.sub_categories_id_seq'::regclass);


--
-- TOC entry 5055 (class 2604 OID 106860)
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- TOC entry 4988 (class 2604 OID 106861)
-- Name: tables id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables ALTER COLUMN id SET DEFAULT nextval('public.dining_tables_id_seq'::regclass);


--
-- TOC entry 5056 (class 2604 OID 106862)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 5062 (class 2606 OID 106864)
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 5064 (class 2606 OID 106866)
-- Name: business_days business_days_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.business_days
    ADD CONSTRAINT business_days_pkey PRIMARY KEY (id);


--
-- TOC entry 5066 (class 2606 OID 106868)
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- TOC entry 5068 (class 2606 OID 106870)
-- Name: customer_locations customer_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_locations
    ADD CONSTRAINT customer_locations_pkey PRIMARY KEY (id);


--
-- TOC entry 5071 (class 2606 OID 106872)
-- Name: customers customers_phone_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_phone_key UNIQUE (phone);


--
-- TOC entry 5073 (class 2606 OID 106874)
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- TOC entry 5075 (class 2606 OID 106876)
-- Name: delivery_zones delivery_zones_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.delivery_zones
    ADD CONSTRAINT delivery_zones_pkey PRIMARY KEY (id);


--
-- TOC entry 5078 (class 2606 OID 106878)
-- Name: tables dining_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT dining_tables_pkey PRIMARY KEY (id);


--
-- TOC entry 5080 (class 2606 OID 106880)
-- Name: driver_locations driver_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.driver_locations
    ADD CONSTRAINT driver_locations_pkey PRIMARY KEY (id);


--
-- TOC entry 5085 (class 2606 OID 106882)
-- Name: drivers drivers_phone_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_phone_unique UNIQUE (phone);


--
-- TOC entry 5087 (class 2606 OID 106884)
-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);


--
-- TOC entry 5089 (class 2606 OID 106886)
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- TOC entry 5091 (class 2606 OID 106888)
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- TOC entry 5095 (class 2606 OID 106890)
-- Name: halls halls_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.halls
    ADD CONSTRAINT halls_pkey PRIMARY KEY (id);


--
-- TOC entry 5098 (class 2606 OID 106892)
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5100 (class 2606 OID 106894)
-- Name: kitchens kitchens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.kitchens
    ADD CONSTRAINT kitchens_pkey PRIMARY KEY (id);


--
-- TOC entry 5102 (class 2606 OID 106896)
-- Name: main_categories main_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.main_categories
    ADD CONSTRAINT main_categories_name_key UNIQUE (name);


--
-- TOC entry 5104 (class 2606 OID 106898)
-- Name: main_categories main_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.main_categories
    ADD CONSTRAINT main_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 5106 (class 2606 OID 106900)
-- Name: menu_item_note_options menu_item_note_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_item_note_options
    ADD CONSTRAINT menu_item_note_options_pkey PRIMARY KEY (menu_item_id, note_option_id);


--
-- TOC entry 5108 (class 2606 OID 106902)
-- Name: menu_items menu_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5110 (class 2606 OID 106904)
-- Name: note_options note_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.note_options
    ADD CONSTRAINT note_options_pkey PRIMARY KEY (id);


--
-- TOC entry 5112 (class 2606 OID 106906)
-- Name: order_item_note_options order_item_note_options_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item_note_options
    ADD CONSTRAINT order_item_note_options_pkey PRIMARY KEY (id);


--
-- TOC entry 5115 (class 2606 OID 106908)
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- TOC entry 5120 (class 2606 OID 106910)
-- Name: orders orders_order_no_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_no_key UNIQUE (order_no);


--
-- TOC entry 5122 (class 2606 OID 106912)
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- TOC entry 5124 (class 2606 OID 106914)
-- Name: printers printers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_pkey PRIMARY KEY (id);


--
-- TOC entry 5128 (class 2606 OID 106916)
-- Name: recipe_ingredients recipe_ingredients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_pkey PRIMARY KEY (id);


--
-- TOC entry 5131 (class 2606 OID 106918)
-- Name: recipes recipes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_pkey PRIMARY KEY (id);


--
-- TOC entry 5133 (class 2606 OID 106920)
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- TOC entry 5135 (class 2606 OID 106922)
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- TOC entry 5137 (class 2606 OID 106924)
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- TOC entry 5139 (class 2606 OID 106926)
-- Name: shifts shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.shifts
    ADD CONSTRAINT shifts_pkey PRIMARY KEY (id);


--
-- TOC entry 5141 (class 2606 OID 106928)
-- Name: sub_categories sub_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_categories
    ADD CONSTRAINT sub_categories_pkey PRIMARY KEY (id);


--
-- TOC entry 5143 (class 2606 OID 106930)
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- TOC entry 5145 (class 2606 OID 106932)
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (user_id, role_id);


--
-- TOC entry 5147 (class 2606 OID 106934)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 5149 (class 2606 OID 106936)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 5069 (class 1259 OID 106937)
-- Name: idx_customer_locations_customer_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_customer_locations_customer_id ON public.customer_locations USING btree (customer_id);


--
-- TOC entry 5076 (class 1259 OID 106938)
-- Name: idx_delivery_zones_geojson_gin; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_delivery_zones_geojson_gin ON public.delivery_zones USING gin (geojson);


--
-- TOC entry 5081 (class 1259 OID 106939)
-- Name: idx_driver_latest; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX idx_driver_latest ON public.driver_locations USING btree (driver_id);


--
-- TOC entry 5082 (class 1259 OID 106940)
-- Name: idx_driver_locations_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_driver_locations_status ON public.driver_locations USING btree (status);


--
-- TOC entry 5083 (class 1259 OID 106941)
-- Name: idx_driver_locations_updated_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_driver_locations_updated_at ON public.driver_locations USING btree (updated_at);


--
-- TOC entry 5092 (class 1259 OID 106942)
-- Name: idx_expenses_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_category ON public.expenses USING btree (category);


--
-- TOC entry 5093 (class 1259 OID 106943)
-- Name: idx_expenses_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_expenses_date ON public.expenses USING btree (date);


--
-- TOC entry 5096 (class 1259 OID 106944)
-- Name: idx_inventory_supplier; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_inventory_supplier ON public.inventory_items USING btree (supplier_id);


--
-- TOC entry 5113 (class 1259 OID 106945)
-- Name: idx_order_items_order; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);


--
-- TOC entry 5116 (class 1259 OID 106946)
-- Name: idx_orders_center; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_center ON public.orders USING btree (sales_center);


--
-- TOC entry 5117 (class 1259 OID 106947)
-- Name: idx_orders_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_created_at ON public.orders USING btree (created_at);


--
-- TOC entry 5118 (class 1259 OID 106948)
-- Name: idx_orders_customer_location_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_orders_customer_location_id ON public.orders USING btree (customer_location_id);


--
-- TOC entry 5125 (class 1259 OID 106949)
-- Name: idx_recipe_ingredients_inventory; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recipe_ingredients_inventory ON public.recipe_ingredients USING btree (inventory_item_id);


--
-- TOC entry 5126 (class 1259 OID 106950)
-- Name: idx_recipe_ingredients_recipe; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recipe_ingredients_recipe ON public.recipe_ingredients USING btree (recipe_id);


--
-- TOC entry 5129 (class 1259 OID 106951)
-- Name: idx_recipes_menu_item; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_recipes_menu_item ON public.recipes USING btree (menu_item_id);


--
-- TOC entry 5178 (class 2620 OID 106952)
-- Name: order_items trg_recalc_total_aiud; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_recalc_total_aiud AFTER INSERT OR DELETE OR UPDATE ON public.order_items FOR EACH ROW EXECUTE FUNCTION public.fn_recalc_order_total();


--
-- TOC entry 5150 (class 2606 OID 106953)
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- TOC entry 5152 (class 2606 OID 106958)
-- Name: customer_locations customer_locations_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customer_locations
    ADD CONSTRAINT customer_locations_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- TOC entry 5153 (class 2606 OID 106963)
-- Name: customers customers_last_zone_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_last_zone_id_fkey FOREIGN KEY (last_zone_id) REFERENCES public.delivery_zones(id) ON DELETE SET NULL;


--
-- TOC entry 5154 (class 2606 OID 106968)
-- Name: tables dining_tables_hall_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tables
    ADD CONSTRAINT dining_tables_hall_id_fkey FOREIGN KEY (hall_id) REFERENCES public.halls(id) ON DELETE CASCADE;


--
-- TOC entry 5155 (class 2606 OID 106973)
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- TOC entry 5151 (class 2606 OID 106978)
-- Name: categories fk_categories_sub_category; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT fk_categories_sub_category FOREIGN KEY (sub_category_id) REFERENCES public.sub_categories(id) ON DELETE CASCADE;


--
-- TOC entry 5159 (class 2606 OID 106983)
-- Name: menu_items fk_menu_items_category; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT fk_menu_items_category FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- TOC entry 5166 (class 2606 OID 106988)
-- Name: orders fk_orders_customer_location; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fk_orders_customer_location FOREIGN KEY (customer_location_id) REFERENCES public.customer_locations(id) ON DELETE SET NULL;


--
-- TOC entry 5156 (class 2606 OID 106993)
-- Name: inventory_items inventory_items_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;


--
-- TOC entry 5157 (class 2606 OID 106998)
-- Name: menu_item_note_options menu_item_note_options_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_item_note_options
    ADD CONSTRAINT menu_item_note_options_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- TOC entry 5158 (class 2606 OID 107003)
-- Name: menu_item_note_options menu_item_note_options_note_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_item_note_options
    ADD CONSTRAINT menu_item_note_options_note_option_id_fkey FOREIGN KEY (note_option_id) REFERENCES public.note_options(id) ON DELETE CASCADE;


--
-- TOC entry 5160 (class 2606 OID 107008)
-- Name: menu_items menu_items_main_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_main_category_id_fkey FOREIGN KEY (main_category_id) REFERENCES public.main_categories(id) ON DELETE SET NULL;


--
-- TOC entry 5161 (class 2606 OID 107013)
-- Name: menu_items menu_items_sub_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.menu_items
    ADD CONSTRAINT menu_items_sub_category_id_fkey FOREIGN KEY (sub_category_id) REFERENCES public.sub_categories(id) ON DELETE SET NULL;


--
-- TOC entry 5162 (class 2606 OID 107018)
-- Name: order_item_note_options order_item_note_options_note_option_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item_note_options
    ADD CONSTRAINT order_item_note_options_note_option_id_fkey FOREIGN KEY (note_option_id) REFERENCES public.note_options(id);


--
-- TOC entry 5163 (class 2606 OID 107023)
-- Name: order_item_note_options order_item_note_options_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_item_note_options
    ADD CONSTRAINT order_item_note_options_order_item_id_fkey FOREIGN KEY (order_item_id) REFERENCES public.order_items(id) ON DELETE CASCADE;


--
-- TOC entry 5164 (class 2606 OID 107028)
-- Name: order_items order_items_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.menu_items(id) ON DELETE RESTRICT;


--
-- TOC entry 5165 (class 2606 OID 107033)
-- Name: order_items order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE CASCADE;


--
-- TOC entry 5167 (class 2606 OID 107038)
-- Name: orders orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- TOC entry 5168 (class 2606 OID 107043)
-- Name: orders orders_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id) ON DELETE SET NULL;


--
-- TOC entry 5169 (class 2606 OID 107048)
-- Name: orders orders_hall_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_hall_id_fkey FOREIGN KEY (hall_id) REFERENCES public.halls(id) ON DELETE SET NULL;


--
-- TOC entry 5170 (class 2606 OID 107053)
-- Name: orders orders_table_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_table_id_fkey FOREIGN KEY (table_id) REFERENCES public.tables(id) ON DELETE SET NULL;


--
-- TOC entry 5171 (class 2606 OID 107058)
-- Name: printers printers_kitchen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.printers
    ADD CONSTRAINT printers_kitchen_id_fkey FOREIGN KEY (kitchen_id) REFERENCES public.kitchens(id) ON DELETE CASCADE;


--
-- TOC entry 5172 (class 2606 OID 107063)
-- Name: recipe_ingredients recipe_ingredients_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id);


--
-- TOC entry 5173 (class 2606 OID 107068)
-- Name: recipe_ingredients recipe_ingredients_recipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipe_ingredients
    ADD CONSTRAINT recipe_ingredients_recipe_id_fkey FOREIGN KEY (recipe_id) REFERENCES public.recipes(id) ON DELETE CASCADE;


--
-- TOC entry 5174 (class 2606 OID 107073)
-- Name: recipes recipes_menu_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.recipes
    ADD CONSTRAINT recipes_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE;


--
-- TOC entry 5175 (class 2606 OID 107078)
-- Name: sub_categories sub_categories_main_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sub_categories
    ADD CONSTRAINT sub_categories_main_category_id_fkey FOREIGN KEY (main_category_id) REFERENCES public.main_categories(id) ON DELETE CASCADE;


--
-- TOC entry 5176 (class 2606 OID 107083)
-- Name: user_roles user_roles_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- TOC entry 5177 (class 2606 OID 107088)
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 5332 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;


-- Completed on 2026-03-08 13:22:26

--
-- PostgreSQL database dump complete
--


