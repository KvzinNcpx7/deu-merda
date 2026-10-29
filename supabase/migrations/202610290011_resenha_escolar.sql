-- Additive fictional school caricatures and political satire. Existing room JSON is untouched.
begin;
insert into private.cards(id,text,pack,pick,theme,tone,grammar) values
('escola-a68','Heide','escola',0,'estudante','irreverente','nominal'),
('escola-a69','Érika','escola',0,'estudante','irreverente','nominal'),
('escola-a70','Cristiane','escola',0,'estudante','irreverente','nominal'),
('escola-a71','Natália','escola',0,'estudante','irreverente','nominal'),
('escola-a72','Priscila','escola',0,'estudante','irreverente','nominal'),
('escola-a73','Márcia','escola',0,'estudante','irreverente','nominal'),
('escola-a74','Xirley','escola',0,'estudante','irreverente','nominal'),
('escola-a75','Iara','escola',0,'estudante','irreverente','nominal'),
('escola-a76','Michelle','escola',0,'estudante','irreverente','nominal'),
('escola-a77','Bolsonaro','escola',0,'politica','irreverente','nominal'),
('escola-a78','Lula','escola',0,'politica','irreverente','nominal'),
('escola-a79','Vorcaro','escola',0,'politica','irreverente','nominal'),
('escola-a80','A Heide gritando “QUE PORRA É ESSA?!”','escola',0,'estudante','irreverente','nominal'),
('escola-a81','A Cristiane dando bronca no projetor.','escola',0,'estudante','irreverente','nominal'),
('escola-a82','A Érika da Galera convocando reunião de emergência.','escola',0,'estudante','irreverente','nominal'),
('escola-a83','A Natália interrompendo a apresentação.','escola',0,'estudante','irreverente','nominal'),
('escola-a84','A Priscila confiscando o último pão de queijo.','escola',0,'estudante','irreverente','nominal'),
('escola-a85','A Márcia tentando controlar o caos.','escola',0,'estudante','irreverente','nominal'),
('escola-a86','A Xirley presidindo a CPI do recreio.','escola',0,'estudante','irreverente','nominal'),
('escola-a87','A Iara berrando “IARARARA!” no microfone.','escola',0,'estudante','irreverente','nominal'),
('escola-a88','A Michelle, filha da Xirley, no caos do recreio.','escola',0,'estudante','irreverente','nominal'),
('escola-a89','Bolsonaro disputando a presidência do grêmio.','escola',0,'politica','irreverente','nominal'),
('escola-a90','Lula prometendo merenda em dobro.','escola',0,'politica','irreverente','nominal'),
('escola-a91','Vorcaro financiando a cantina com dinheiro de Banco Imobiliário.','escola',0,'politica','irreverente','nominal'),
('escola-a92','A Heide no telão sem explicação.','escola',0,'estudante','irreverente','nominal'),
('escola-a93','Cristiane descobrindo a cagada do século.','escola',0,'escatologia','irreverente','nominal'),
('escola-a94','Érika convocando a assembleia do banheiro entupido.','escola',0,'escatologia','irreverente','nominal')
on conflict (id) do nothing;
commit;
