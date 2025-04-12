// BOJ - 25206 너의 평점은

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    double gpa = 0, credit = 0;
    map<string, double> m;
    m["A+"] = 4.5; m["A0"] = 4.0; m["B+"] = 3.5;
    m["B0"] = 3.0; m["C+"] = 2.5; m["C0"] = 2.0;
    m["D+"] = 1.5; m["D0"] = 1.0; m["F"] = 0.0;
    loop(i, 1, 20) {
        string _; cin >> _;
        double cre; cin >> cre;
        string grade; cin >> grade;
        if(grade == "P") continue;
        gpa += (cre * m[grade]);
        credit += cre;
    }
    cout << (gpa / credit) << '\n';
}