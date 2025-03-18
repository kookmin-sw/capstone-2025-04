// BOJ - 25318 solved.ac 2022

#include <bits/stdc++.h>
#define loop(i, s, n) for(ll i = s; i <= n; i++)
#define LOOP(i, s, n) for(ll i = s; i < n; i++)
#define ll long long int
 
using namespace std;
 
struct date {
    ll y, m, d, h = 0, min = 0, s = 0;
};

int days[13] = {0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
int get_days(ll y, int m) {
    return days[m] + (m == 2 && y == 20);
}

double get_time(date d) {
    double ret = d.d + d.y * 365;
    if(d.y > 20) ret++;
    loop(i, 1, d.m - 1) ret += (double) get_days(d.y, i);
    ret += ((double) d.h / 24.0 + (double) d.min / (60.0 * 24.0) + (double) d.s / (3600.0 * 24.0));
    return ret;
}

int main() {
 
    ll n; cin >> n;
    if(n == 0) {
        cout << 0 << '\n';
        return 0;
    }
    vector<date> v; vector<double> ratings;
    loop(i, 1, n) {
        ll y, m, d, h, min, s; double rating;
        scanf("%04lld/%02lld/%02lld %02lld:%02lld:%02lld", &y, &m, &d, &h, &min, &s); y -= 2000;
        cin >> rating;
        v.push_back({y, m, d, h, min, s}); ratings.push_back(rating);
    }

    vector<double> p; double tn = get_time(v[n - 1]);
    loop(i, 0, n - 1) {
        double ti = get_time(v[i]);
        double maxa = pow(0.5, (tn - ti) / 365);
        double maxb = pow(0.9, n - i - 1);
        p.push_back(max(maxa, maxb));
    }

    double xa = 0, xb = 0;
    loop(i, 0, n - 1) {
        xa += (p[i] * ratings[i]);
        xb += p[i];
    }

    cout << round(xa / xb) << '\n';
}